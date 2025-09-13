import { Action, Command, Ctx, Message, On, Update } from 'nestjs-telegraf';
import { UserRole } from 'src/schemas/user.schema';
import { UserService } from 'src/user/user.service';
import { Context, Markup } from 'telegraf';
import { RequisiteService } from '../requisite/requisite.service';
import { UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { Types } from 'mongoose';
import { formatAccountNumber } from '../common/helpers/format-account';

@Update()
@UseGuards(AdminGuard)
export class RequisiteUpdate {
  constructor(
    private readonly userService: UserService,
    private readonly requisiteService: RequisiteService,
  ) {}

  @Command('add_requisite')
  async addRequisite(@Ctx() ctx: Context) {
    await ctx.reply(
      'Выберите тип реквизита:',
      Markup.inlineKeyboard([
        [Markup.button.callback('Карта', 'create_card')],
        [Markup.button.callback('Кошелек', 'create_wallet')],
      ]),
    );
  }

  @Command('requisites')
  async listRequisites(@Ctx() ctx: Context) {
    const requisites = await this.requisiteService.findAll();

    let message = '📋 Список реквизитов:\n\n';

    for (let index = 0; index < requisites.length; index++) {
      const req = requisites[index];
      const operator = await this.userService.findById(req.operator_id);

      message += `${index + 1}. ${req.name} (${req.type})\n`;
      message += `Номер: ${req.account_number}\n\n`;
      message += `Оператор: ${operator?.username || 'не назначен'}\n\n`;
    }

    await ctx.reply(message);
  }

  @Action(/^create_(card|wallet)$/)
  async handleRequisiteType(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const type = ctx.match[1];
    ctx['session'] = { creatingRequisite: { type } };

    if (type === 'card') {
      await ctx.reply(
        'Введите данные реквизита в формате:\n' +
          'Название ФИО_владельца Номер_карты Описание\n' +
          'Пример: MBANK Иванов Иван Иванович 5536913826451234 Зарплатная карта\n' +
          '⚠️ Обязательно указывайте всё через пробелы!',
      );
    } else if (type === 'wallet') {
      await ctx.reply(
        'Введите данные кошелька в формате:\n' +
          'Название Номер_кошелька Описание\n' +
          'Пример: Bybit TYrZXyYL6i7bhhkZ2gUtQis7yVzF5qYdbv Личный кошелек\n' +
          '⚠️ Обязательно указывайте всё через пробелы!',
      );
    }
  }

  @Command('bind_requisite')
  async bindRequisiteMenu(@Ctx() ctx: Context) {
    const [operators, requisites] = await Promise.all([
      this.userService.getAllOperators(),
      this.requisiteService.findAll(),
    ]);

    const buttons = requisites.length
      ? requisites.map((req) => [
          Markup.button.callback(
            `${req.name} ${formatAccountNumber(
              req.account_number,
              req.type,
            )} (${req.type})`,
            `select_requisite_${req._id}`,
          ),
        ])
      : [[Markup.button.callback('Нет реквизитов', 'nooo')]];

    await ctx.reply(
      'Выберите реквизит для привязки:',
      Markup.inlineKeyboard(buttons),
    );
  }

  @Command('unbind_requisite')
  async unbindRequisiteMenu(@Ctx() ctx: Context) {
    const requisites = await this.requisiteService.findAll();

    const buttons = [];

    for (const requisite of requisites) {
      const operator = await this.userService.findById(requisite.operator_id);
      const displayName =
        operator?.username || operator?.first_name || 'Не привязан';

      buttons.push([
        Markup.button.callback(
          `${requisite.name} ${formatAccountNumber(
            requisite.account_number,
            requisite.type,
          )}  (${requisite.type}) - ${displayName}`,
          `unbind_requisite_${requisite._id}_${
            operator?.username || operator?.first_name
          }`,
        ),
      ]);
    }

    await ctx.reply(
      'Выберите реквизит для отвязки:',
      Markup.inlineKeyboard(buttons),
    );
  }

  @Action(/^unbind_requisite_(.+)$/)
  async unbindRequisite(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const requisiteId = ctx.match[1];
    console.log(ctx.match[2]);

    try {
      // const operator = await this.userService.findById(requisite.operator_id);

      const requisite = await this.requisiteService.unbindFromOperator(
        requisiteId,
      );
      await this.userService.removeRequisiteFromOperator(
        requisite.operator_id,
        new Types.ObjectId(requisiteId),
      );

      await ctx.editMessageText(`✅ Реквизит "${requisite.name}" отвязан от @`);
    } catch (e) {
      await ctx.answerCbQuery(`❌ Ошибка: ${e.message}`, { show_alert: true });
    }
  }

  @Command('delete_requisite')
  async deleteRequisite(@Ctx() ctx: Context) {
    const requisites = await this.requisiteService.findAll();

    const buttons = requisites.map((req) => [
      Markup.button.callback(`❌ ${req.name}`, `delete_requisite_${req._id}`),
    ]);

    await ctx.reply(
      'Выберите реквизит для удаления:',
      Markup.inlineKeyboard(buttons),
    );
  }

  @Action(/^delete_requisite_(.+)$/)
  async confirmDelete(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const requisiteId = ctx.match[1];

    await ctx.reply(
      'Подтвердите удаление:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Удалить', `confirm_delete_${requisiteId}`),
          Markup.button.callback('❌ Отмена', 'cancel_delete'),
        ],
      ]),
    );
  }

  @Action(/^confirm_delete_(.+)$/)
  async handleDelete(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const requisiteId = ctx.match[1];

    try {
      await this.requisiteService.delete(requisiteId);
      await ctx.editMessageText('✅ Реквизит успешно удален');
    } catch (e) {
      await ctx.reply(`❌ Ошибка: ${e.message}`);
    }
  }

  @Action(/^select_requisite_(.+)$/)
  async selectRequisite(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const requisiteId = ctx.match[1];
    const operators = await this.userService.getAllOperators();

    const buttons = operators.map((op) => [
      Markup.button.callback(op.username, `bind_${requisiteId}_to_${op._id}`),
    ]);

    await ctx.editMessageText(
      'Выберите оператора:',
      Markup.inlineKeyboard(buttons),
    );
  }

  @Action(/^bind_(.+)_to_(.+)$/)
  async bindRequisiteToOperator(
    @Ctx() ctx: Context & { match: RegExpExecArray },
  ) {
    const [_, requisiteId, operatorId] = ctx.match;

    try {
      const [requisite, operator] = await Promise.all([
        this.requisiteService.bindToOperator(requisiteId, operatorId),
        this.userService.addRequisiteToOperator(operatorId, requisiteId),
      ]);

      await ctx.editMessageText(
        `✅ Реквизит "${requisite.name}" привязан к оператору @${operator.username}`,
      );
    } catch (e) {
      await ctx.reply(`❌ Ошибка привязки: ${e.message}`);
    }
  }
}
