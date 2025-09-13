import { Action, Command, Ctx, Message, Update } from 'nestjs-telegraf';
import { UserRole } from 'src/schemas/user.schema';
import { UserService } from 'src/user/user.service';
import { Context, Markup } from 'telegraf';
import { UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { Types } from 'mongoose';
import { RequisiteService } from '../requisite/requisite.service';
import { WithdrawService } from '../withdraw/withdraw.service';
import { SessionAction } from '../common/consts/session-actions.const';
import { formatAccountNumber } from '../common/helpers/format-account';

@Update()
export class OperatorUpdate {
  constructor(
    private readonly userService: UserService,
    private readonly requisitesService: RequisiteService,
    private readonly withdrawService: WithdrawService,
  ) {}

  @UseGuards(AdminGuard)
  @Command('operators')
  async operatorsMenu(@Ctx() ctx: Context) {
    await ctx.reply(
      '🛠 Управление операторами:',
      Markup.inlineKeyboard([
        [Markup.button.callback('➕ Добавить', 'add_operator')],
        [Markup.button.callback('🗑 Удалить', 'operator_remove')],
        [Markup.button.callback('📋 Список', 'operator_list')],
      ]),
    );
  }

  @UseGuards(AdminGuard)
  @Action('add_operator')
  async addOperator(@Ctx() ctx: Context) {
    // const admin = await this.userService.getUserByTelegramId(ctx.from.id);
    //
    // if (admin.role !== UserRole.ADMIN) {
    //   return ctx.reply('🚫 Недостаточно прав!');
    // }

    const users = await this.userService.findAllUsers();

    const buttons = users.length
      ? users.map((user) => [
          Markup.button.callback(
            `${user.first_name || 'Без имени'} (${user.telegram_id})`,
            `make_operator:${user.telegram_id}`,
          ),
        ])
      : [[Markup.button.callback('Нет пользователей', 'noop')]];

    try {
      await ctx.editMessageText(
        '👥 Выберите пользователя, чтобы назначить оператором:',
        Markup.inlineKeyboard(buttons),
      );
    } catch (e) {
      return ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  }

  @UseGuards(AdminGuard)
  @Action(/make_operator:(\d+)/)
  async makeOperator(@Ctx() ctx: Context) {
    // const admin = await this.userService.getUserByTelegramId(ctx.from.id);
    //
    // if (admin.role !== UserRole.ADMIN) {
    //   return ctx.reply('🚫 Недостаточно прав!');
    // }

    const match = ctx['match'] as RegExpMatchArray;
    const telegramId = parseInt(match[1]);

    try {
      const user = await this.userService.updateUserRole(
        telegramId,
        UserRole.OPERATOR,
      );
      const username = typeof user.username === 'string' ? user.username : null;
      await ctx.editMessageText(
        `✅ Пользователь ${
          username ? '@' + username : user.first_name || 'пользователь'
        } теперь оператор!`,
      );
    } catch (e) {
      return ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  }

  @UseGuards(AdminGuard)
  @Action('operator_remove')
  async removeOperatorMenu(@Ctx() ctx: Context) {
    const operators = await this.userService.getAllOperators();

    const buttons = operators.map((op) => [
      Markup.button.callback(
        `❌ ${op.username}`,
        `operator_remove_${op.telegram_id}`,
      ),
    ]);

    await ctx.editMessageText(
      'Выберите оператора для удаления:',
      Markup.inlineKeyboard(buttons),
    );
  }

  @UseGuards(AdminGuard)
  @Action(/^operator_remove_(\d+)$/)
  async removeOperatorAction(@Ctx() ctx: Context) {
    const match = ctx['match'] as RegExpMatchArray;
    const telegramId = parseInt(match[1]);
    const user = await this.userService.updateUserRole(
      telegramId,
      UserRole.USER,
    );

    await ctx.editMessageText(`✅ @${user.username} больше не оператор!`);
  }

  @UseGuards(AdminGuard)
  @Action('operator_list')
  async listOperators(@Ctx() ctx: Context) {
    const operators = await this.userService.getAllOperators();

    const message = operators.length
      ? operators
          .map((op) => `👤 ${op.username} (ID: ${op.telegram_id})`)
          .join('\n')
      : 'Нет операторов.';

    await ctx.editMessageText(`📋 Операторы:\n\n${message}`);
  }

  @Command('withdraw')
  async handleWithdrawCommand(@Ctx() ctx: Context) {
    try {
      const operator = await this.userService.getUserByTelegramId(ctx.from.id);
      const requisites = await this.requisitesService.findByOperator(
        operator._id,
      );

      if (requisites.length === 0) {
        return ctx.reply('❌ У вас нет активных реквизитов');
      }

      const keyboard = requisites.map((req) => [
        Markup.button.callback(
          `${req.name} ${formatAccountNumber(req.account_number, req.type)} (${
            req.type
          })`,
          `op_withdraw_${req._id}`,
        ),
      ]);

      await ctx.reply(
        '📋 Выберите реквизит для вывода:',
        Markup.inlineKeyboard(keyboard),
      );
    } catch (e) {
      await ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  }

  @Action(/^op_withdraw_(.+)$/)
  async handleWithdrawRequisite(
    @Ctx() ctx: Context & { match: RegExpExecArray },
  ) {
    try {
      const requisiteId = ctx.match[1];
      const operator = await this.userService.findByTelegramId(ctx.from.id);
      const requisite = await this.requisitesService.findById(requisiteId);

      // Проверки
      if (requisite.operator_id.toString() !== operator.id) {
        await ctx.reply('❌ Этот реквизит не принадлежит вам');
        return;
      }

      // Проверяем, что баланс положительный
      if (requisite.balance <= 0) {
        await ctx.reply('❌ Баланс реквизита равен нулю. Вывод невозможен.');
        return;
      }

      // ===== УБРАН ВВОД СУММЫ - СРАЗУ ПЕРЕХОДИМ К ВЫВОДУ =====
      // Получаем крипто-реквизиты
      const cryptoRequisites =
        await this.requisitesService.getCryptoRequisites();
      if (cryptoRequisites.length === 0) {
        throw new Error('Нет доступных крипто-реквизитов');
      }

      // Формируем сообщение с реквизитами
      let message = `Для вывода всего баланса (${requisite.balance}) отправьте средства на:\n\n`;
      cryptoRequisites.forEach((req, index) => {
        message += `Реквизит ${index + 1}: ${req.account_number}\n`;
      });

      message += `\nПосле отправки пришлите 2 чека транзакций`;
      // Сохраняем сессию для ожидания чеков

      ctx['session'] = {
        action: SessionAction.AwaitingWithdrawChecks,
        withdrawAmount: requisite.balance, // Весь баланс реквизита
        cryptoRequisites: cryptoRequisites.map((r) => r.account_number),
        operatorId: operator._id,
        requisiteId: requisite._id,
        // originalMessage: orignalMessage.message_id + 1, // ID следующего сообщения
      };

      // Отправляем реквизиты
      await ctx.reply(message, {
        reply_markup: { remove_keyboard: true },
      });
      // ===== КОНЕЦ ИЗМЕНЕНИЙ =====

      await ctx.answerCbQuery();
    } catch (e) {
      console.log(e);
      await ctx.answerCbQuery(`❌ Ошибка: ${e.message}`);
    }
  }
  private async checkAdmin(ctx: Context): Promise<boolean> {
    const user = await this.userService.getUserByTelegramId(ctx.from.id);

    if (user.role !== UserRole.ADMIN) {
      await ctx.reply('🚫 Недостаточно прав!');
      return false;
    }
    return true;
  }
}
