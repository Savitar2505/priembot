"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperatorUpdate = void 0;
const nestjs_telegraf_1 = require("nestjs-telegraf");
const user_schema_1 = require("../schemas/user.schema");
const user_service_1 = require("../user/user.service");
const telegraf_1 = require("telegraf");
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
const requisite_service_1 = require("../requisite/requisite.service");
const withdraw_service_1 = require("../withdraw/withdraw.service");
const session_actions_const_1 = require("../common/consts/session-actions.const");
const format_account_1 = require("../common/helpers/format-account");
let OperatorUpdate = class OperatorUpdate {
    constructor(userService, requisitesService, withdrawService) {
        this.userService = userService;
        this.requisitesService = requisitesService;
        this.withdrawService = withdrawService;
    }
    async operatorsMenu(ctx) {
        await ctx.reply('🛠 Управление операторами:', telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('➕ Добавить', 'add_operator')],
            [telegraf_1.Markup.button.callback('🗑 Удалить', 'operator_remove')],
            [telegraf_1.Markup.button.callback('📋 Список', 'operator_list')],
        ]));
    }
    async addOperator(ctx) {
        const users = await this.userService.findAllUsers();
        const buttons = users.length
            ? users.map((user) => [
                telegraf_1.Markup.button.callback(`${user.first_name || 'Без имени'} (${user.telegram_id})`, `make_operator:${user.telegram_id}`),
            ])
            : [[telegraf_1.Markup.button.callback('Нет пользователей', 'noop')]];
        try {
            await ctx.editMessageText('👥 Выберите пользователя, чтобы назначить оператором:', telegraf_1.Markup.inlineKeyboard(buttons));
        }
        catch (e) {
            return ctx.reply(`❌ Ошибка: ${e.message}`);
        }
    }
    async makeOperator(ctx) {
        const match = ctx['match'];
        const telegramId = parseInt(match[1]);
        try {
            const user = await this.userService.updateUserRole(telegramId, user_schema_1.UserRole.OPERATOR);
            const username = typeof user.username === 'string' ? user.username : null;
            await ctx.editMessageText(`✅ Пользователь ${username ? '@' + username : user.first_name || 'пользователь'} теперь оператор!`);
        }
        catch (e) {
            return ctx.reply(`❌ Ошибка: ${e.message}`);
        }
    }
    async removeOperatorMenu(ctx) {
        const operators = await this.userService.getAllOperators();
        const buttons = operators.map((op) => [
            telegraf_1.Markup.button.callback(`❌ ${op.username}`, `operator_remove_${op.telegram_id}`),
        ]);
        await ctx.editMessageText('Выберите оператора для удаления:', telegraf_1.Markup.inlineKeyboard(buttons));
    }
    async removeOperatorAction(ctx) {
        const match = ctx['match'];
        const telegramId = parseInt(match[1]);
        const user = await this.userService.updateUserRole(telegramId, user_schema_1.UserRole.USER);
        await ctx.editMessageText(`✅ @${user.username} больше не оператор!`);
    }
    async listOperators(ctx) {
        const operators = await this.userService.getAllOperators();
        const message = operators.length
            ? operators
                .map((op) => `👤 ${op.username} (ID: ${op.telegram_id})`)
                .join('\n')
            : 'Нет операторов.';
        await ctx.editMessageText(`📋 Операторы:\n\n${message}`);
    }
    async handleWithdrawCommand(ctx) {
        try {
            const operator = await this.userService.getUserByTelegramId(ctx.from.id);
            const requisites = await this.requisitesService.findByOperator(operator._id);
            if (requisites.length === 0) {
                return ctx.reply('❌ У вас нет активных реквизитов');
            }
            const keyboard = requisites.map((req) => [
                telegraf_1.Markup.button.callback(`${req.name} ${(0, format_account_1.formatAccountNumber)(req.account_number, req.type)} (${req.type})`, `op_withdraw_${req._id}`),
            ]);
            await ctx.reply('📋 Выберите реквизит для вывода:', telegraf_1.Markup.inlineKeyboard(keyboard));
        }
        catch (e) {
            await ctx.reply(`❌ Ошибка: ${e.message}`);
        }
    }
    async handleWithdrawRequisite(ctx) {
        try {
            const requisiteId = ctx.match[1];
            const operator = await this.userService.findByTelegramId(ctx.from.id);
            const requisite = await this.requisitesService.findById(requisiteId);
            if (requisite.operator_id.toString() !== operator.id) {
                await ctx.reply('❌ Этот реквизит не принадлежит вам');
                return;
            }
            if (requisite.balance <= 0) {
                await ctx.reply('❌ Баланс реквизита равен нулю. Вывод невозможен.');
                return;
            }
            const cryptoRequisites = await this.requisitesService.getCryptoRequisites();
            if (cryptoRequisites.length === 0) {
                throw new Error('Нет доступных крипто-реквизитов');
            }
            let message = `Для вывода всего баланса (${requisite.balance}) отправьте средства на:\n\n`;
            cryptoRequisites.forEach((req, index) => {
                message += `Реквизит ${index + 1}: ${req.account_number}\n`;
            });
            message += `\nПосле отправки пришлите 2 чека транзакций`;
            ctx['session'] = {
                action: session_actions_const_1.SessionAction.AwaitingWithdrawChecks,
                withdrawAmount: requisite.balance,
                cryptoRequisites: cryptoRequisites.map((r) => r.account_number),
                operatorId: operator._id,
                requisiteId: requisite._id,
            };
            await ctx.reply(message, {
                reply_markup: { remove_keyboard: true },
            });
            await ctx.answerCbQuery();
        }
        catch (e) {
            console.log(e);
            await ctx.answerCbQuery(`❌ Ошибка: ${e.message}`);
        }
    }
    async checkAdmin(ctx) {
        const user = await this.userService.getUserByTelegramId(ctx.from.id);
        if (user.role !== user_schema_1.UserRole.ADMIN) {
            await ctx.reply('🚫 Недостаточно прав!');
            return false;
        }
        return true;
    }
};
exports.OperatorUpdate = OperatorUpdate;
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, nestjs_telegraf_1.Command)('operators'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], OperatorUpdate.prototype, "operatorsMenu", null);
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, nestjs_telegraf_1.Action)('add_operator'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], OperatorUpdate.prototype, "addOperator", null);
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, nestjs_telegraf_1.Action)(/make_operator:(\d+)/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], OperatorUpdate.prototype, "makeOperator", null);
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, nestjs_telegraf_1.Action)('operator_remove'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], OperatorUpdate.prototype, "removeOperatorMenu", null);
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, nestjs_telegraf_1.Action)(/^operator_remove_(\d+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], OperatorUpdate.prototype, "removeOperatorAction", null);
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, nestjs_telegraf_1.Action)('operator_list'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], OperatorUpdate.prototype, "listOperators", null);
__decorate([
    (0, nestjs_telegraf_1.Command)('withdraw'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], OperatorUpdate.prototype, "handleWithdrawCommand", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^op_withdraw_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OperatorUpdate.prototype, "handleWithdrawRequisite", null);
exports.OperatorUpdate = OperatorUpdate = __decorate([
    (0, nestjs_telegraf_1.Update)(),
    __metadata("design:paramtypes", [user_service_1.UserService,
        requisite_service_1.RequisiteService,
        withdraw_service_1.WithdrawService])
], OperatorUpdate);
//# sourceMappingURL=operator.update.js.map