import {
  Action,
  Command,
  Ctx,
  Hears,
  Message,
  On,
  Update,
} from 'nestjs-telegraf';
import { UserRole } from 'src/schemas/user.schema';
import { UserService } from 'src/user/user.service';
import { Context, Markup } from 'telegraf';
import { GroupService } from '../group/group.service';
import { RequisiteService } from '../requisite/requisite.service';
import { UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { Types } from 'mongoose';

@Update()
export class GroupUpdate {
  constructor(
    private groupService: GroupService,
    private userService: UserService,
    private requisiteService: RequisiteService,
  ) {}

  @UseGuards(AdminGuard)
  @Command('all_groups')
  async listGroups(@Ctx() ctx: Context) {
    const groups = await this.groupService.getAllGroups();

    const buttons = groups.map((group) => [
      Markup.button.callback(
        group.title,
        `group_action_${group.telegram_group_id}`,
      ),
    ]);

    await ctx.reply('📂 Список групп:', Markup.inlineKeyboard(buttons));
  }

  @UseGuards(AdminGuard)
  @Action(/^group_action_(.+)$/)
  async groupActionsMenu(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const groupId = ctx.match[1];
    const group = await this.groupService.findByTelegramId(parseInt(groupId));

    const buttons = [
      [
        Markup.button.callback(
          '✏️ Изменить название',
          `rename_group_${groupId}`,
        ),
      ],
      [
        Markup.button.callback(
          '👥 Привязать оператора',
          `bind_operator_${groupId}`,
        ),
      ],
    ];

    await ctx.editMessageText(
      `⚙️ Управление группой: ${group.title}\n` +
        // `Реквизиты: ${group.requisite_ids.length}\n` +
        `Операторов: ${group.operator_ids.length}`,
      Markup.inlineKeyboard(buttons),
    );
  }

  @Command('group_balance')
  async handleBalanceCommand(@Ctx() ctx: Context) {
    if (ctx.chat.type === 'private') {
      return ctx.reply('ℹ️ Эта команда доступна только в группах');
    }

    try {
      const group = await this.groupService.getGroupBalance(
        ctx.chat.id.toString(),
      );

      if (!group) {
        return ctx.reply('❌ Группа не зарегистрирована');
      }

      const message = `💰 Текущий баланс группы: ${group.balance}\n`;

      await ctx.reply(message);
    } catch (e) {
      await ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  }

  @UseGuards(AdminGuard)
  @Command('reset_balance')
  async handleResetBalance(@Ctx() ctx: Context) {
    try {
      if (ctx.chat.type === 'private') {
        return ctx.reply('ℹ️ Эта команда доступна только в группах');
      }

      const group = await this.groupService.resetGroupBalance(
        ctx.chat.id.toString(),
      );

      await ctx.reply(`✅ Баланс группы обнулен\n` + `Новый баланс: 0 \n`);
    } catch (e) {
      await ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  }

  @UseGuards(AdminGuard)
  @Action(/^bind_requisite_(.+)$/)
  async bindRequisiteToGroup(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const groupId = ctx.match[1];
    const requisites = await this.requisiteService.getAvailableRequisites();

    const buttons = requisites.length
      ? requisites.map((req) => [
          Markup.button.callback(
            `${req.name} (${req.type})`,
            `select_requisite_${groupId}_${req._id}`,
          ),
        ])
      : [[Markup.button.callback('Нет Доступных реквизитов', 'noop')]];

    await ctx.editMessageText(
      'Выберите реквизит для привязки:',
      Markup.inlineKeyboard(buttons),
    );
  }

  @UseGuards(AdminGuard)
  @Action(/^select_requisite_(.+)_(.+)$/)
  async processRequisiteSelection(
    @Ctx() ctx: Context & { match: RegExpExecArray },
  ) {
    const [_, telegramGroupId, requisiteId] = ctx.match;

    try {
      const groupId = await this.groupService.findByTelegramId(
        parseInt(telegramGroupId),
      );
      await this.groupService.addRequisiteToGroup(telegramGroupId, requisiteId);
      await this.requisiteService.addRequisiteToGroup(groupId._id, requisiteId);
      await ctx.editMessageText('✅ Реквизит успешно привязан!');
    } catch (e) {
      await ctx.editMessageText(`❌ Ошибка: ${e.message}`);
    }
  }

  @UseGuards(AdminGuard)
  @Action(/^rename_group_(.+)$/)
  async renameGroup(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const groupId = ctx.match[1];
    ctx['session'] = { action: 'renaming_group', groupId };

    await ctx.reply('Введите новое название группы:', Markup.removeKeyboard());
  }

  @UseGuards(AdminGuard)
  @Action(/^bind_operator_(.+)$/)
  async bindOperatorToGroup(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const groupId = ctx.match[1];

    const group = await this.groupService.findByTelegramId(groupId);
    const operators = await this.userService.getOperatorsWithGroupBinding(
      group._id,
    );

    const buttons = operators.map((op) => {
      const status = op.isBound ? '🔗' : '❌';
      return [
        Markup.button.callback(
          `${op.username} ${status}`,
          `select_operator_${groupId}_${op._id}`,
        ),
      ];
    });

    await ctx.editMessageText(
      'Выберите оператора:',
      Markup.inlineKeyboard(buttons),
    );
  }

  @UseGuards(AdminGuard)
  @Action(/^select_operator_(.+)_(.+)$/)
  async processOperatorSelection(
    @Ctx() ctx: Context & { match: RegExpExecArray },
  ) {
    const [_, telegramGroupId, operatorId] = ctx.match;

    const group = await this.groupService.findByTelegramId(telegramGroupId);

    const isBound = await this.userService.isOperatorBoundToGroup(
      operatorId,
      group._id,
    );

    if (isBound) {
      await this.groupService.removeOperatorFromGroup(
        telegramGroupId,
        operatorId,
      );
      await this.userService.unbindOperatorFromGroup(group._id, operatorId);
      await ctx.editMessageText('❌ Оператор отвязан от группы.');
    } else {
      await this.groupService.addOperatorToGroup(telegramGroupId, operatorId);
      await this.userService.bindOperatorToGroup(group._id, operatorId);
      await ctx.editMessageText('✅ Оператор успешно привязан к группе.');
    }
  }
}
