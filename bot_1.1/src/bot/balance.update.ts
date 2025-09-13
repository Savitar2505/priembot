import { Action, Command, Ctx, Message, Update } from 'nestjs-telegraf';
import { UserRole } from 'src/schemas/user.schema';
import { UserService } from 'src/user/user.service';
import { Context, Markup } from 'telegraf';
import { GroupService } from '../group/group.service';
import { RequisiteService } from '../requisite/requisite.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { UseGuards } from '@nestjs/common';

@Update()
@UseGuards(AdminGuard)
export class BalanceUpdate {
  constructor(
    private groupService: GroupService,
    private userService: UserService,
    private requisiteService: RequisiteService,
  ) {}

  @Command('balance')
  async showBalanceMenu(@Ctx() ctx: Context) {
    const buttons = [
      [Markup.button.callback('🏢 По группам', 'balance_groups')],
      [Markup.button.callback('👤 По операторам', 'balance_operators')],
      [Markup.button.callback('💳 По реквизитам', 'balance_requisites')],
    ];

    await ctx.reply('Выберите тип баланса:', Markup.inlineKeyboard(buttons));
  }

  @Action('balance_groups')
  async showGroupsBalance(@Ctx() ctx: Context) {
    const groups = await this.groupService.getAllGroups();

    const message = groups.map((g) => `${g.title}: ${g.balance}`).join('\n');

    await ctx.editMessageText(`Балансы групп:\n\n${message}`);
  }

  // @Action('balance_operators')
  // async showOperatorsBalance(@Ctx() ctx: Context) {
  //   const operators = await this.userService.getAllOperators();
  //
  //   const balances = await Promise.all(
  //     operators.map(async (op) => ({
  //       name: op.username,
  //       balance: await this.userService.getOperatorBalance(op._id),
  //     })),
  //   );
  //
  //   const message = balances.map((b) => `${b.name}: ${b.balance} \n `;
  //
  //
  //   await ctx.editMessageText(`Балансы операторов:\n\n${message}`);
  // }

  @Action('balance_operators')
  async showOperatorsBalance(@Ctx() ctx: Context) {
    const operators = await this.userService.getOperatorsWithBalance();

    const message = operators
      .map((op) => {
        const reqs = op.requisites
          .map((r) => `— ${r.name}: ${r.balance}`)
          .join('\n');
        return `👤 ${op.username} — ${op.balance}\n${reqs}`;
      })
      .join('\n\n');

    await ctx.editMessageText(`📊 Балансы операторов:\n\n${message}`);
  }

  @Action('balance_requisites')
  async showRequisitesBalance(@Ctx() ctx: Context) {
    const requisites = await this.requisiteService.getAllActive();

    const message = requisites
      .map((r) => `${r.name} (${r.type}): ${r.balance}`)
      .join('\n');

    await ctx.editMessageText(`Балансы реквизитов:\n\n${message}`);
  }
}
