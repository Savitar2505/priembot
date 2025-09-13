import {
  Update,
  Start,
  Command,
  Ctx,
  On,
  Message,
  Action,
  Hears,
  InjectBot,
} from 'nestjs-telegraf';
import { Context, Markup, Telegraf } from 'telegraf';
import { UserService } from '../user/user.service';
import { UserRole } from '../schemas/user.schema';
import { GroupService } from '../group/group.service';
import { RequisiteService } from '../requisite/requisite.service';
import { Inject, UseGuards } from '@nestjs/common';
import { OperatorGuard } from '../common/guards/operator.guard';
import { WithdrawService } from '../withdraw/withdraw.service';
import { Types } from 'mongoose';
import { Operation, OperationStatuses } from '../schemas/operation.schema';
import { OperationService } from '../operation/operation.service';
import { WithdrawStatuses } from '../schemas/withdraw.schema';
import { AdminGuard } from '../common/guards/admin.guard';
import { SessionAction } from '../common/consts/session-actions.const';
import { formatAccountNumber } from '../common/helpers/format-account';

@Update()
export class BotUpdate {
  constructor(
    private readonly userService: UserService,
    private readonly groupService: GroupService,
    private readonly requisiteService: RequisiteService,
    private readonly withdrawService: WithdrawService,
    private readonly operationService: OperationService,
    @InjectBot() private readonly bot: Telegraf<any>,
  ) {}

  @Command('start')
  async start(@Ctx() ctx: Context) {
    const user = await this.userService.findOrCreateUser({
      telegram_id: ctx.from.id,
      username: ctx.from.username,
      first_name: ctx.from.first_name,
    });

    await ctx.reply(`Добро пожаловать, ${user.username || user.first_name}!`);
  }

  private getRoleMenu(role: UserRole) {
    const buttons = [];

    if (role === UserRole.ADMIN) {
      // buttons.push(
      //     Markup.button.callback('Добавить оператора', 'add_operator'),
      //     Markup.button.callback('Создать группу', 'create_group'),
      //     Markup.button.callback('Баланс', 'balance'),
      // );
      // buttons.push(
      //   ['Добавить оператора', 'Создать группу'],
      //   ['Баланс', 'Список операторов'],
      // );
    }

    if (role === UserRole.OPERATOR) {
      // buttons.push(
      //     Markup.button.callback('Мои реквизиты', 'my_requisites'),
      //     Markup.button.callback('Баланс', 'balance'),
      // );
      // buttons.push(['Мои реквизиты', 'Баланс']);
    }

    return Markup.keyboard(buttons, { columns: 2 }).resize();
  }

  @On('new_chat_members')
  async handleGroupAdded(@Ctx() ctx: Context) {
    const botMember = ctx.message['new_chat_members']?.find(
      (m) => m.id === ctx.botInfo.id,
    );

    if (botMember && ctx.chat.type !== 'private') {
      try {
        // Проверяем, не зарегистрирована ли группа уже
        const existingGroup = await this.groupService.findByTelegramId(
          ctx.chat.id,
        );
        if (existingGroup) {
          await ctx.reply('ℹ️ Эта группа уже зарегистрирована!');
          return;
        }

        const admin = await this.userService.getUserByTelegramId(ctx.from.id);

        if (admin.role !== UserRole.ADMIN) {
          await ctx.reply(
            '❌ Только администраторы могут регистрировать группы!',
          );
          await ctx.leaveChat();
          return;
        }

        const group = await this.groupService.createOrUpdateGroup({
          telegram_group_id: ctx.chat.id,
          title: ctx.chat.title || `Группа ${ctx.chat.id}`,
          // created_by: admin._id,
        });

        await ctx.reply(`✅ Группа зарегистрирована!`);
      } catch (e) {
        await ctx.reply(`❌ Ошибка регистрации: ${e.message}`);
        await ctx.leaveChat();
      }
    }
  }

  @On('photo')
  async handlePhoto(@Ctx() ctx: Context) {
    if (ctx.chat.type === 'private') {
      return this.handleWithdrawChecks(ctx);
    } else {
      return this.handleGroupCheckPhoto(ctx);
    }
  }

  @On('document')
  async handleDocument(@Ctx() ctx: Context) {
    const document = ctx.message['document'];
    if (!document) return;

    if (document.mime_type === 'application/pdf') {
      return this.handleGroupCheckDocument(ctx);
    } else {
      await ctx.reply('Пожалуйста, отправьте PDF-файл 📄');
    }
  }

  private async handleGroupCheckDocument(@Ctx() ctx: Context) {
    try {
      const document = ctx.message['document'];
      if (!document || document.mime_type !== 'application/pdf') {
        await ctx.reply('Пожалуйста, отправьте PDF-файл чека 📄');
        return;
      }

      const group = await this.groupService.findByTelegramId(ctx.chat.id);
      if (!group) {
        await ctx.reply('Группа не зарегистрирована!');
        return;
      }

      const operators = await this.userService.findOperatorsByGroupId(
        group._id,
      );
      if (!operators || operators.length === 0) {
        await ctx.reply('Нет операторов, привязанных к этой группе!');
        return;
      }

      const originalMessageId = ctx.message.message_id;
      const processingMessage = await ctx.reply('⏳ Обработка PDF-чека...', {
        reply_parameters: { message_id: originalMessageId },
      });

      for (const operator of operators) {
        const caption = `Новый PDF-чек из группы: ${group.title}`;

        // Создаем операцию для каждого оператора
        const operation = await this.operationService.create({
          group_id: group._id,
          group_chat_id: ctx.chat.id,
          original_message_id: originalMessageId,
          group_message_id: processingMessage.message_id,
          operator_id: operator._id,
          document_file_id: document.file_id,
          status: OperationStatuses.PENDING,
        });

        await ctx.telegram.sendDocument(
          operator.telegram_id,
          document.file_id,
          {
            caption,
            reply_markup: Markup.inlineKeyboard([
              Markup.button.callback(
                'Подтвердить',
                `select_req_${operation._id}`,
              ),
              Markup.button.callback(
                'Отклонить',
                `reject_check_${operation._id}`,
              ),
            ]).reply_markup,
          },
        );
      }
    } catch (e) {
      await ctx.reply(`Ошибка обработки PDF-чека: ${e.message}`);
    }
  }

  private async handleWithdrawChecks(@Ctx() ctx: Context) {
    const session = ctx['session'];
    if (!session || session.action !== 'AWAITING_WITHDRAW_CHECKS') return;

    // Сохраняем чеки в сессии
    if (!session.checks) session.checks = [];

    const photo = ctx.message['photo'][ctx.message['photo'].length - 1];
    session.checks.push(photo.file_id);

    // Если получено 2 чека
    if (session.checks.length === 2) {
      try {
        // Создаем запрос на вывод
        const operator = await this.userService.findById(session.operatorId);
        const requisite = await this.requisiteService.findById(
          session.requisiteId,
        );

        const request = await this.withdrawService.create({
          operator: operator._id,
          target_type: 'OPERATOR',
          amount: session.withdrawAmount,
          requisite: requisite._id,
          status: WithdrawStatuses.PENDING,
        });

        const mediaGroup = session.checks.map((fileId) => ({
          type: 'photo',
          media: fileId,
        }));

        await this.notifyAdmins(request, operator, requisite, mediaGroup);

        await ctx.reply(
          '✅ Чеки отправлены администраторам. Ожидайте подтверждения.',
        );
        ctx['session'] = null;
      } catch (e) {
        await ctx.reply(`❌ Ошибка отправки чеков: ${e.message}`);
      }
    } else {
      await ctx.reply(`✅ Чек получен (${session.checks.length}/2)`);
    }
  }

  private async handleGroupCheckPhoto(@Ctx() ctx: Context) {
    try {
      const group = await this.groupService.findByTelegramId(ctx.chat.id);
      if (!group) {
        await ctx.reply('Группа не зарегистрирована!');
        return;
      }

      const operators = await this.userService.findOperatorsByGroupId(
        group._id,
      );

      if (!operators || operators.length === 0) {
        await ctx.reply('Нет операторов, привязанных к этой группе!');
        return;
      }

      const originalMessageId = ctx.message.message_id;

      const processingMessage = await ctx.reply('⏳ Обработка чека...', {
        reply_parameters: {
          message_id: originalMessageId,
        },
      });

      const photo = ctx.message['photo'][ctx.message['photo'].length - 1];

      for (const operator of operators) {
        const caption = `Новый чек из группы: ${group.title}`;

        // Создаем операцию для каждого оператора
        const operation = await this.operationService.create({
          group_id: group._id,
          group_chat_id: ctx.chat.id,
          original_message_id: originalMessageId,
          group_message_id: processingMessage.message_id,
          operator_id: operator._id,
          photo_file_id: photo.file_id,
          status: OperationStatuses.PENDING,
        });

        await ctx.telegram.sendPhoto(operator.telegram_id, photo.file_id, {
          caption,
          reply_markup: Markup.inlineKeyboard([
            Markup.button.callback(
              'Подтвердить',
              `select_req_${operation._id}`,
            ),
            Markup.button.callback(
              'Отклонить',
              `reject_check_${operation._id}`,
            ),
          ]).reply_markup,
        });
      }
    } catch (e) {
      await ctx.reply(`Ошибка обработки чека: ${e.message}`);
    }
  }

  @Action(/^select_req_(.+)$/)
  async handleSelectRequisite(
    @Ctx() ctx: Context & { match: RegExpExecArray },
  ) {
    try {
      const operationId = ctx.match[1];
      const operation = await this.operationService.findPendingOperationById(
        operationId,
      );

      if (!operation) {
        await ctx.answerCbQuery('Операция устарела или не найдена');
        return;
      }

      const operator = await this.userService.findById(operation.operator_id);

      // Получаем активные реквизиты оператора
      const requisites =
        await this.requisiteService.getActiveRequisitesForOperator(
          operator._id,
        );

      if (!requisites || requisites.length === 0) {
        await ctx.editMessageReplyMarkup(undefined);
        await ctx.reply('⚠️ У вас нет активных реквизитов для этой группы');
        await ctx.answerCbQuery();
        return;
      }

      // Создаём inline клавиатуру с реквизитами
      const keyboard = requisites.map((req) => [
        Markup.button.callback(
          `${req.name} (${formatAccountNumber(req.account_number, req.type)})`,
          `request_amount_${operationId}_${req._id}`,
        ),
      ]);

      // ⬇️ Меняем кнопки у того же сообщения
      await ctx.editMessageReplyMarkup({
        inline_keyboard: keyboard,
      });

      await ctx.answerCbQuery();
    } catch (e) {
      await ctx.answerCbQuery('Ошибка выбора реквизита');
      await ctx.reply(`Ошибка: ${e.message}`);
    }
  }

  @Action(/^request_amount_(.+)_(.+)$/)
  async requestAmount(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const operationId = ctx.match[1];
    const requisiteId = new Types.ObjectId(ctx.match[2]);

    try {
      const operation = await this.operationService.findPendingOperationById(
        operationId,
      );

      await this.operationService.update(operationId, {
        requisite_id: requisiteId,
      });

      ctx['session'] = {
        action: SessionAction.AwaitingCheckAmount,
        operationId,
        requisiteId,
        groupId: operation.group_id,
        groupChatId: operation.group_chat_id,
        groupMessageId: operation.group_message_id,
        originalMessageId: operation.original_message_id,
      };

      await ctx.answerCbQuery();
      await ctx.editMessageReplyMarkup(undefined);

      await ctx.reply('Введите сумму для зачисления:');
    } catch (e) {
      await ctx.answerCbQuery('Ошибка обработки операции');
      await ctx.reply(`Ошибка: ${e.message}`);
    }
  }
  @Hears('🚫 Отменить')
  async cancelAmountInput(@Ctx() ctx: Context) {
    ctx['session'] = null;
    await ctx.reply('❌ Отменено', Markup.removeKeyboard());
  }

  @Action(/^reject_check_(.+)$/)
  async rejectCheck(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const operationId = ctx.match[1];

    try {
      const operation = await this.operationService.findPendingOperationById(
        operationId,
      );
      if (!operation) {
        await ctx.answerCbQuery('Операция устарела или не найдена');
        return;
      }

      await ctx.telegram.editMessageText(
        operation.group_chat_id,
        operation.group_message_id,
        undefined,
        '❌ Чек отклонен',
      );

      await ctx.telegram.setMessageReaction(
        operation.group_chat_id,
        operation.original_message_id,
        [
          {
            type: 'emoji',
            emoji: '👎',
          },
        ],
      );

      await this.operationService.reject(operationId);
      await ctx.answerCbQuery();
      await ctx.editMessageReplyMarkup(undefined);
      await ctx.telegram.setMessageReaction(
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        [
          {
            type: 'emoji',
            emoji: '👎', // например, крестик вместо 👎
          },
        ],
      );

      await ctx.reply('Чек отклонен', {
        reply_parameters: {
          message_id: ctx.callbackQuery.message?.message_id,
        },
      });
    } catch (e) {
      await ctx.answerCbQuery('Ошибка при отклонении чека');
      await ctx.reply(`Ошибка: ${e.message}`);
    }
  }

  @UseGuards(OperatorGuard)
  @Command('my_requisites')
  async showMyRequisites(@Ctx() ctx: Context) {
    const operator = await this.userService.getUserByTelegramId(ctx.from.id);
    const requisites = await this.requisiteService.findByOperator(operator._id);

    let message = '📋 Ваши реквизиты:\n\n';
    requisites.forEach((req) => {
      message += `▫️ ${req.name} (${req.type})\n`;
      message += `${req.owner && req.owner} \n`;
      message += `Номер: ${formatAccountNumber(
        req.account_number,
        req.type,
      )}\n`;
      message += `Баланс: ${req.balance}\n\n`;
    });

    await ctx.reply(message);
  }

  @UseGuards(OperatorGuard)
  @Command('my_balance')
  async showMyBalance(@Ctx() ctx: Context) {
    const operator = await this.userService.getUserByTelegramId(ctx.from.id);
    const balance = await this.userService.getOperatorBalance(operator._id);

    await ctx.reply(`💰 Ваш текущий баланс: ${balance}`);
  }

  @UseGuards(AdminGuard)
  @Command('all_req')
  async listReq(@Ctx() ctx: Context) {
    const groups = await this.groupService.findAll();

    const buttons = groups.length
      ? groups.map((group) => [
          Markup.button.callback(
            `${group.title}`,
            `select_operators_${group._id}`,
          ),
        ])
      : [[Markup.button.callback('Нет групп', 'nooo')]];

    await ctx.reply('Выберете группу:', Markup.inlineKeyboard(buttons));
  }

  @Action(/^select_operators_(.+)$/)
  async selectOperators(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const groupId = ctx.match[1];
    const operators = await this.userService.findOperatorsByGroupId(groupId);

    const buttons = operators.map((op) => [
      Markup.button.callback(op.username, `select_op_req_${op._id}`),
    ]);

    await ctx.editMessageText(
      'Выберите оператора:',
      Markup.inlineKeyboard(buttons),
    );
  }

  @Action(/^select_op_req_(.+)$/)
  async selectRequisite(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const operatorId = ctx.match[1];

    const operator = await this.userService.findById(
      new Types.ObjectId(operatorId),
    );
    const requisites = await this.requisiteService.findByIds(
      operator.requisites,
    );

    const buttons = requisites.map((req) => [
      Markup.button.callback(
        `${req.name} ${req.balance} ${req.is_active ? '🟢' : '🔴'}`,
        `toggle_req_${req._id}_op_${operatorId}`,
      ),
    ]);

    await ctx.editMessageText(
      'Реквизиты оператора (нажмите, чтобы переключить активность):',
      Markup.inlineKeyboard(buttons),
    );
  }

  // @Action(/^toggle_req_(.+)_op_(.+)$/)
  // async toggleRequisite(@Ctx() ctx: Context & { match: RegExpExecArray }) {
  //   const requisiteId = ctx.match[1];
  //   const operatorId = ctx.match[2];
  //
  //   const requisite = await this.requisiteService.toggleActive(requisiteId);
  //
  //   // Повторно выводим обновлённый список реквизитов
  //   const operator = await this.userService.findById(
  //     new Types.ObjectId(operatorId),
  //   );
  //
  //   const requisites = await this.requisiteService.findByIds(
  //     operator.requisites,
  //   );
  //
  //   const buttons = requisites.map((req) => [
  //     Markup.button.callback(
  //       `${req.name} ${req.balance} ${req.is_active ? '🟢' : '🔴'}`,
  //       `toggle_req_${req._id}_op_${operatorId}`,
  //     ),
  //   ]);
  //
  //   await ctx.editMessageText(
  //     'Реквизиты оператора (нажмите, чтобы переключить активность):',
  //     Markup.inlineKeyboard(buttons),
  //   );
  //
  //   const groups = await this.groupService.findByIds(operator.groups);
  //
  //   for (const group of groups) {
  //     const operators = await this.userService.findOperatorsByGroupId(
  //       group._id,
  //     );
  //
  //     let groupMessage = `📋 Актуальные реквизиты в группе "${group.title}":\n`;
  //
  //     for (const operator of operators) {
  //       const requisites = await this.requisiteService.findByIds(
  //         operator.requisites || [],
  //       );
  //       const activeRequisites = requisites.filter((r) => r.is_active);
  //
  //       if (activeRequisites.length) {
  //         for (const req of activeRequisites) {
  //           groupMessage += `• ${req.name} ${req.account_number} \n`;
  //         }
  //       }
  //     }
  //
  //     if (
  //       groupMessage.trim() ===
  //       `📋 Актуальные реквизиты в группе "${group.title}":`
  //     ) {
  //       groupMessage += `\n⚠️ Нет активных реквизитов.`;
  //     }
  //
  //     await ctx.telegram.sendMessage(group.telegram_group_id, groupMessage);
  //   }
  // }

  @Action(/^toggle_req_(.+)_op_(.+)$/)
  async toggleRequisite(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const requisiteId = ctx.match[1];
    const operatorId = ctx.match[2];

    await this.requisiteService.toggleActive(requisiteId);

    const operator = await this.userService.findById(
      new Types.ObjectId(operatorId),
    );
    const requisites = await this.requisiteService.findByIds(
      operator.requisites,
    );

    const buttons = requisites.map((req) => [
      Markup.button.callback(
        `${req.name} ${req.balance} ${req.is_active ? '🟢' : '🔴'}`,
        `toggle_req_${req._id}_op_${operatorId}`,
      ),
    ]);

    // Добавляем кнопку "Сохранить"
    buttons.push([
      Markup.button.callback(
        '💾 Сохранить',
        `save_requisites_op_${operatorId}`,
      ),
    ]);

    await ctx.editMessageText(
      'Реквизиты оператора (нажмите, чтобы переключить активность):',
      Markup.inlineKeyboard(buttons),
    );
  }

  @Action(/^save_requisites_op_(.+)$/)
  async saveRequisites(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const operatorId = ctx.match[1];

    const operator = await this.userService.findById(
      new Types.ObjectId(operatorId),
    );
    const groupsData = await this.groupService.getGroupsWithActiveRequisites(
      operator.groups,
    );

    for (const group of groupsData) {
      let message = `📋 Актуальные реквизиты в группе "${group.title}":\n`;

      for (const operator of group.operators) {
        if (operator.active_requisites.length > 0) {
          for (const req of operator.active_requisites) {
            message += `• ${req?.owner || req.name} ${req.account_number}\n`;
            if (req.description) {
              message += `${req.description}\n`;
            }
          }
        }
      }

      if (
        message.trim() === `📋 Актуальные реквизиты в группе "${group.title}":`
      ) {
        message += '\n⚠️ Нет активных реквизитов.';
      }

      await ctx.telegram.sendMessage(group.telegram_group_id, message);
    }

    await ctx.answerCbQuery('Реквизиты сохранены и отправлены в группы ✅');
  }

  @Command('withdraw_group_balance')
  async handleWithdrawGroupBalanceCommand(@Ctx() ctx: Context) {
    if (ctx.chat.type === 'private') {
      await ctx.reply('❌ Эта команда работает только в группе!');
      return;
    }

    try {
      // Получаем информацию о группе
      const group = await this.groupService.findByTelegramId(ctx.chat.id);
      if (!group) {
        await ctx.reply('❌ Группа не зарегистрирована!');
        return;
      }

      // Проверяем права пользователя - должен быть администратором группы
      const userId = ctx.from.id;
      const isAdmin = await this.isUserGroupAdmin(ctx, userId);

      if (!isAdmin) {
        await ctx.reply(
          '❌ Только администраторы группы могут инициировать вывод баланса',
        );
        return;
      }

      // Проверяем, что баланс положительный
      if (group.balance <= 0) {
        await ctx.reply(
          '❌ Баланс группы равен нулю или отрицательный. Вывод невозможен.',
        );
        return;
      }

      // Получаем пользователя, инициировавшего запрос
      const user = await this.userService.findByTelegramId(userId);

      // Создаем запрос на вывод всего баланса
      const request = await this.withdrawService.create({
        target_type: 'GROUP',
        amount: group.balance,
        status: WithdrawStatuses.PENDING,
        group: group._id, // Сохраняем ID группы
      });

      const adminMessage = [
        `🚨 Запрос на вывод ВСЕГО баланса группы!`,
        `👥 Группа: ${group.title}`,
        `👤 Инициатор: @${user.username}`,
        `💰 Сумма: ${group.balance}`,
        `🆔 ID запроса: ${request._id}`,
      ].join('\n');

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            '✅ Подтвердить',
            `approve_group_withdraw_${request._id}`,
          ),
          Markup.button.callback(
            '❌ Отклонить',
            `reject_group_withdraw_${request._id}`,
          ),
        ],
      ]);

      // Отправляем запрос админам
      const admins = await this.userService.getAdmins();
      await Promise.all(
        admins.map((admin) =>
          this.bot.telegram.sendMessage(admin.telegram_id, adminMessage, {
            reply_markup: keyboard.reply_markup,
          }),
        ),
      );

      await ctx.reply(
        `✅ Запрос на вывод всего баланса (${group.balance} ) отправлен администраторам. Ожидайте подтверждения.`,
        { reply_parameters: { message_id: ctx.message.message_id } },
      );
    } catch (e) {
      await ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  }

  // Метод для проверки, является ли пользователь администратором группы
  private async isUserGroupAdmin(
    ctx: Context,
    userId: number,
  ): Promise<boolean> {
    try {
      // Получаем список администраторов группы
      const administrators = await ctx.getChatAdministrators();

      // Проверяем, есть ли пользователь среди администраторов
      return administrators.some((admin) => admin.user.id === userId);
    } catch (e) {
      console.error('Ошибка при получении администраторов группы:', e);
      return false;
    }
  }

  @Action(/^approve_group_withdraw_(.+)$/)
  async handleApproveGroupWithdraw(
    @Ctx() ctx: Context & { match: RegExpExecArray },
  ) {
    try {
      const requestId = ctx.match[1];
      const admin = await this.userService.findByTelegramId(ctx.from.id);

      // Проверка прав администратора
      if (!admin || admin.role !== UserRole.ADMIN) {
        await ctx.answerCbQuery('❌ Только для администраторов');
        return;
      }

      // Находим запрос
      const request = await this.withdrawService.findById(requestId);
      if (!request) {
        throw new Error('Запрос на вывод не найден');
      }

      // Проверка статуса
      if (request.status !== WithdrawStatuses.PENDING) {
        await ctx.answerCbQuery('Операция устарела или не найдена');
        return;
      }

      // Получаем группу
      const group = await this.groupService.findById(request.group);

      // Проверка баланса
      if (group.balance < request.amount) {
        throw new Error('Недостаточно средств на балансе группы');
      }

      // Обновляем баланс группы
      await this.groupService.updateBalance(group._id, -request.amount);

      // Обновляем статус запроса
      await this.withdrawService.approve(requestId, admin._id);

      // Уведомляем инициатора
      const initiator = await this.userService.findById(admin._id);
      await this.bot.telegram.sendMessage(
        initiator.telegram_id,
        `✅ Ваш запрос на вывод баланса группы ${group.title} подтвержден!\n` +
          `💰 Сумма: ${request.amount} \n` +
          `🆔 ID запроса: ${request._id}`,
      );

      // Обновляем сообщение администратора
      await ctx.editMessageText(
        `✅ Запрос #${requestId} подтвержден\n` +
          `👥 Группа: ${group.title}\n` +
          `💰 Сумма: ${request.amount} \n` +
          `👤 Инициатор: @${initiator.username}`,
      );

      await ctx.answerCbQuery('✅ Вывод подтвержден');
    } catch (e) {
      await ctx.answerCbQuery(`❌ Ошибка: ${e.message}`);
    }
  }

  @Action(/^reject_group_withdraw_(.+)$/)
  async handleRejectGroupWithdraw(
    @Ctx() ctx: Context & { match: RegExpExecArray },
  ) {
    try {
      const requestId = ctx.match[1];
      const admin = await this.userService.findByTelegramId(ctx.from.id);

      // Проверка прав администратора
      if (!admin || admin.role !== UserRole.ADMIN) {
        await ctx.answerCbQuery('❌ Только для администраторов');
        return;
      }

      // Находим запрос
      const request = await this.withdrawService.findById(requestId);
      if (!request) {
        throw new Error('Запрос на вывод не найден');
      }

      // Обновляем статус запроса
      await this.withdrawService.reject(requestId, admin._id);

      // Уведомляем инициатора
      const initiator = await this.userService.findById(admin._id);
      const group = await this.groupService.findById(request.group);

      await this.bot.telegram.sendMessage(
        initiator.telegram_id,
        `❌ Ваш запрос на вывод ${request.amount}  из группы ${group.title} отклонен.\n` +
          `🆔 ID запроса: ${request._id}`,
      );

      // Обновляем сообщение администратора
      await ctx.editMessageText(
        `❌ Запрос #${requestId} отклонен\n` +
          `👥 Группа: ${group.title}\n` +
          `💰 Сумма: ${request.amount} \n` +
          `👤 Инициатор: @${initiator.username}`,
      );

      await ctx.answerCbQuery('❌ Вывод отклонен');
    } catch (e) {
      console.log(e.message);
      await ctx.answerCbQuery(`❌ Ошибка: ${e.message}`);
    }
  }

  // @Action(/^approve_withdraw_(.+)$/)
  // async handleApproveWithdraw(
  //   @Ctx() ctx: Context & { match: RegExpExecArray },
  // ) {
  //   try {
  //     await ctx.answerCbQuery();
  //     const admin = await this.userService.getUserByTelegramId(ctx.from.id);
  //
  //     const req = await this.withdrawService.findById(ctx.match[1]);
  //
  //     // Проверка статуса
  //     if (req.status !== 'PENDING') {
  //       await ctx.answerCbQuery('Операция устарела или не найдена');
  //       return;
  //     }
  //
  //     if (!admin || admin.role !== UserRole.ADMIN) {
  //       await ctx.reply('❌ Только для администраторов');
  //       return;
  //     }
  //
  //     const request = await this.withdrawService.approve(
  //       ctx.match[1],
  //       admin._id,
  //     );
  //
  //     const operator = await this.userService.findById(request.operator);
  //     const requisite = await this.requisiteService.findById(
  //       new Types.ObjectId(request.requisite),
  //     );
  //
  //     // Обновляем баланс реквизита
  //     await this.requisiteService.updateBalance(
  //       request.requisite._id.toString(),
  //       -request.amount,
  //     );
  //
  //     // Обновляем баланс оператора
  //     await this.userService.updateBalance(
  //       request.operator._id.toString(),
  //       -request.amount,
  //     );
  //
  //     // Отправляем уведомление оператору
  //     await this.bot.telegram.sendMessage(
  //       operator.telegram_id,
  //       `✅ Ваш вывод на сумму ${request.amount} одобрен\n` +
  //         `Реквизит: ${requisite.account_number}\n` +
  //         `Новый баланс: ${operator.balance - request.amount}`,
  //     );
  //
  //     // Обновляем сообщение админа
  //     await ctx.editMessageText(
  //       `✅ Запрос #${ctx.match[1]} одобрен\n` +
  //         `Списано: ${request.amount}\n` +
  //         `Реквизит: ${requisite.name}`,
  //     );
  //   } catch (e) {
  //     console.error('Ошибка подтверждения:', e);
  //     await ctx.answerCbQuery(`❌ Ошибка: ${e.message}`);
  //   }
  // }

  @Action(/^reject_withdraw_(.+)$/)
  async handleRejectWithdraw(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    try {
      await ctx.answerCbQuery();
      const admin = await this.userService.getUserByTelegramId(ctx.from.id);

      if (!admin || admin.role !== UserRole.ADMIN) {
        await ctx.reply('❌ Только для администраторов');
        return;
      }

      const request = await this.withdrawService.findById(ctx.match[1]);

      if (request.status !== 'PENDING') {
        await ctx.answerCbQuery('Операция устарела или не найдена');
        return;
      }

      const updatedRequest = await this.withdrawService.reject(
        ctx.match[1],
        admin._id.toString(),
      );

      const operator = await this.userService.findById(request.operator);

      await this.bot.telegram.sendMessage(
        operator.telegram_id,
        `❌ Ваш запрос на вывод ${request.amount}  отклонен`,
      );

      // Обновляем сообщение админа
      await ctx.editMessageText(`❌ Запрос #${ctx.match[1]} отклонен`, {
        reply_markup: { inline_keyboard: [] },
      });
    } catch (e) {
      console.error('Ошибка отклонения:', e);
      await ctx.answerCbQuery(`❌ ${e.message}`);
    }
  }

  @Command('pending')
  async handlePendingCommand(@Ctx() ctx: Context) {
    if (ctx.chat.type !== 'private') return;

    try {
      const operatorTelegramId = ctx.from.id;
      const operator = await this.userService.findByTelegramId(
        operatorTelegramId,
      );
      const pendingOperations = await this.operationService.findPending(
        operator._id,
      );

      if (pendingOperations.length === 0) {
        await ctx.reply('У вас нет необработанных чеков');
        return;
      }

      const buttons = pendingOperations.map((op) => [
        Markup.button.callback(
          `Открыть чек #${op._id}`,
          `open_check_${op._id}`,
        ),
      ]);

      await ctx.reply(
        '📋 Необработанные чеки:',
        Markup.inlineKeyboard(buttons),
      );
    } catch (e) {
      await ctx.reply(`Ошибка получения списка чеков: ${e.message}`);
    }
  }

  @Action(/open_check_(.+)/)
  async handleOpenCheck(@Ctx() ctx: Context & { match: any }) {
    const operationId = ctx.match[1];

    const operation = await this.operationService.findById(operationId);

    if (!operation) {
      await ctx.answerCbQuery('Чек не найден');
      return;
    }

    const caption = `🧾 Чек #${operation._id}\n Дата: ${new Date(
      operation.created_at,
    ).toLocaleString()}`;

    if (operation?.document_file_id) {
      await ctx.replyWithDocument(operation.document_file_id, {
        caption,
        reply_markup: Markup.inlineKeyboard([
          Markup.button.callback('Подтвердить', `select_req_${operation._id}`),
          Markup.button.callback('Отклонить', `reject_check_${operation._id}`),
        ]).reply_markup,
      });
      return;
    }

    await ctx.replyWithPhoto(operation.photo_file_id, {
      caption,
      reply_markup: Markup.inlineKeyboard([
        Markup.button.callback('✅ Подтвердить', `select_req_${operation._id}`),
        Markup.button.callback('❌ Отклонить', `reject_check_${operation._id}`),
      ]).reply_markup,
    });

    await ctx.answerCbQuery();
  }

  private async notifyAdmins(
    request: any,
    operator: any,
    requisite: any,
    mediaGroup: any,
  ) {
    const admins = await this.userService.getAdmins();

    const message = [
      `🚨 Новый запрос на вывод!`,
      `Оператор: @${operator.username}`,
      `Сумма: ${request.amount}`,
      `Реквизит: ${requisite.name}`,
      `ID: ${request._id}`,
    ].join('\n');

    const confirmData = `CONFIRM_ADMIN_WITHDRAW_${request._id}`;
    const rejectData = `reject_withdraw_${request._id}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Подтвердить', confirmData),
        Markup.button.callback('❌ Отклонить', rejectData),
      ],
    ]).reply_markup;

    await Promise.all(
      admins.map(async (admin) => {
        try {
          await this.bot.telegram.sendMediaGroup(admin.telegram_id, mediaGroup);

          await this.bot.telegram.sendMessage(admin.telegram_id, message, {
            reply_markup: keyboard,
          });
        } catch (e) {
          console.error(
            `Ошибка отправки админу ${admin.telegram_id}:`,
            e.message,
          );
        }
      }),
    );
  }

  @Action(/^CONFIRM_ADMIN_WITHDRAW_(.+)$/)
  async handleConfirmWithdraw(
    @Ctx() ctx: Context & { match: RegExpExecArray },
  ) {
    const [withdrawId] = ctx.match.slice(1);

    const withdraw = await this.withdrawService.findById(withdrawId);

    if (withdraw.status === WithdrawStatuses.APPROVED) {
      await ctx.answerCbQuery('Операция устарела или не найдена');
      return;
    }

    ctx['session'] = {
      action: SessionAction.AdminConfirmWithdraw,
      withdrawId,
      operatorId: withdraw.operator,
      operatorRequisiteId: withdraw.requisite,
    };

    await ctx.reply('Введите сумму в USDT:');
  }

  @On('text')
  async handleText(@Ctx() ctx: Context, next: () => Promise<void>) {
    if (!('text' in ctx.message)) return next();
    if (ctx.updateType === 'callback_query') return next();

    const session = ctx['session'];

    if (session?.creatingRequisite) {
      const type = session.creatingRequisite.type;
      const text = ctx.message.text.trim();

      try {
        if (type === 'card') {
          const parts = text.split(' ');
          const cardIndex = parts.findIndex((p) => /^\d{12,20}$/.test(p));

          if (cardIndex === -1 || cardIndex < 2) {
            await ctx.reply(
              '❌ Неверный формат. Убедитесь, что вы ввели:\n<Название> <ФИО> <Карта> <Описание>',
            );
            return;
          }

          const name = parts[0];
          const owner = parts.slice(1, cardIndex).join(' ');
          const account_number = parts[cardIndex];
          const description = parts.slice(cardIndex + 1).join(' ') || null;

          await this.requisiteService.create({
            name,
            owner,
            account_number,
            description,
            type: session.creatingRequisite.type,
            is_active: false,
          });

          await ctx.reply('✅ Реквизит успешно создан!');
          return;
        }

        if (type === 'wallet') {
          const parts = text.split(' ');
          if (parts.length < 2) {
            await ctx.reply(
              '❌ Неверный формат. Убедитесь, что вы ввели:\n<Название> <Номер_кошелька> <Описание>',
            );
            return;
          }

          const name = parts[0];
          const account_number = parts[1];
          const description = parts.slice(2).join(' ') || null;

          await this.requisiteService.create({
            name,
            owner: null,
            account_number,
            description,
            type: session.creatingRequisite.type,
            is_active: false,
          });

          await ctx.reply('✅ Реквизит успешно создан!');
          return;
        }
      } catch (e) {
        await ctx.reply(e.message);
      }
    }

    if (
      session?.action === SessionAction.AwaitingCheckAmount &&
      ctx.chat.type === 'private'
    ) {
      try {
        const amount = Number(ctx.message.text.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
          throw new Error('Некорректная сумма');
        }

        const { groupId, requisiteId, groupChatId, groupMessageId } = session;

        // Обновляем балансы
        const requisite = await this.requisiteService.findById(requisiteId);
        if (!requisite?.operator_id) {
          throw new Error('Реквизит не привязан к оператору');
        }

        await Promise.all([
          this.groupService.updateBalance(groupId, amount),
          this.requisiteService.updateBalance(requisiteId, amount),
        ]);

        await ctx.telegram.editMessageText(
          groupChatId,
          groupMessageId,
          undefined,
          `✅ Подтвержденная сумма: ${amount}`,
        );
        await ctx.telegram.setMessageReaction(
          groupChatId,
          session.originalMessageId,
          [
            {
              type: 'emoji',
              emoji: '👍',
            },
          ],
        );

        await this.operationService.approve(session.operationId);

        await ctx.reply(
          `✅ Чек подтвержден! Начислено: ${amount}`,
          Markup.removeKeyboard(),
        );
        ctx['session'] = null;
      } catch (e) {
        await ctx.reply(`❌ Ошибка: ${e.message}\nПопробуйте снова:`);
      }
      return;
    }
    if (
      session?.action === SessionAction.AdminConfirmWithdraw &&
      ctx.chat.type === 'private'
    ) {
      try {
        const admin = await this.userService.getUserByTelegramId(ctx.from.id);
        if (!admin || admin.role !== UserRole.ADMIN) {
          await ctx.reply('❌ Только для администраторов');
          return;
        }

        // 1. Получаем сумму в USD
        const rawUsdAmount = ctx.message.text.replace(',', '.');
        let usdAmount = parseFloat(rawUsdAmount);
        if (isNaN(usdAmount)) {
          throw new Error('Некорректная сумма USD');
        }
        usdAmount = Math.round(usdAmount * 100) / 100;
        // 2. Получаем данные из сессии
        const withdrawId = session.withdrawId;
        const operatorId = session.operatorId;
        const operatorRequisiteId = session.operatorRequisiteId;

        // 3. Находим запрос на вывод
        const request = await this.withdrawService.findById(withdrawId);

        if (!request) {
          throw new Error('Запрос на вывод не найден');
        }

        const updatedRequest = await this.withdrawService.approve(
          withdrawId,
          admin._id,
          usdAmount,
        );

        await this.requisiteService.decreaseRequisiteBalance(
          operatorRequisiteId,
          request.amount,
        );

        const operator = await this.userService.findById(operatorId);
        const requisite = await this.requisiteService.findById(
          operatorRequisiteId,
        );

        // 8. Уведомляем оператора
        await this.bot.telegram.sendMessage(
          operator.telegram_id,
          `✅ Вывод средств завершен!\n` +
            `📤 Сумма: ${request.amount}\n` +
            `💸 Конвертировано: ${usdAmount} USDT\n`,
        );

        // 9. Уведомляем администратора
        await ctx.reply(`✅ Вывод подтвержден! Оператор уведомлен.`);

        // 10. Очищаем сессию администратора
        ctx['session'] = null;
      } catch (e) {
        await ctx.reply(`❌ Ошибка: ${e.message}\nПопробуйте снова:`);
      }
      return;
    }

    if (
      session?.action === SessionAction.WithdrawAmount &&
      ctx.chat.type === 'private'
    ) {
      try {
        const id = ctx.from.id;
        const amount = Number(ctx.message['text']);

        if (isNaN(amount) || amount <= 0) {
          throw new Error('Некорректная сумма');
        }

        const operator = await this.userService.findByTelegramId(id);
        const requisite = await this.requisiteService.findById(
          session.requisiteId,
        );

        // Проверки
        if (requisite.operator_id.toString() !== operator.id) {
          throw new Error('Реквизит не принадлежит оператору');
        }
        if (requisite.balance < amount) {
          throw new Error(
            `Недостаточно средств. Доступно: ${requisite.balance}`,
          );
        }

        // ===== НОВЫЙ КОД: Отправка крипто-реквизитов =====
        // Получаем крипто-реквизиты из базы
        const cryptoRequisites =
          await this.requisiteService.getCryptoRequisites();

        if (cryptoRequisites.length === 0) {
          throw new Error('Нет доступных крипто-реквизитов');
        }

        // Формируем сообщение с реквизитами
        let message = `Для вывода ${amount}  отправьте средства на:\n\n`;
        cryptoRequisites.forEach((req, index) => {
          message += `Реквизит ${index + 1}: ${req.account_number}\n`;
        });

        message += `\nПосле отправки пришлите 2 чека транзакций в ответ на это сообщение!`;

        // Сохраняем сессию для ожидания чеков
        ctx['session'] = {
          action: 'AWAITING_WITHDRAW_CHECKS',
          withdrawAmount: amount,
          cryptoRequisites: cryptoRequisites.map((r) => r.account_number),
          operatorId: operator._id,
          requisiteId: requisite._id,
          originalMessage: ctx.message.message_id + 1, // ID следующего сообщения
        };

        // Отправляем реквизиты
        await ctx.reply(message, {
          reply_markup: { remove_keyboard: true },
        });
        // ===== КОНЕЦ НОВОГО КОДА =====
      } catch (e) {
        await ctx.reply(`❌ Ошибка: ${e.message}\nПопробуйте снова:`);
      }

      return;
    }

    return next();
  }

  @On('message')
  async handleMigrate(@Ctx() ctx: Context) {
    const message: any = ctx.message;

    if (message?.migrate_to_chat_id) {
      const oldChatId = message.chat.id;
      const newChatId = message.migrate_to_chat_id;

      await this.groupService.updateChatId(oldChatId, newChatId);

      await ctx.reply(
        `Группа была обновлена до супергруппы. Обновил chatId: ${newChatId}`,
      );
    }
  }
}
