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
exports.RequisiteUpdate = void 0;
const nestjs_telegraf_1 = require("nestjs-telegraf");
const user_service_1 = require("../user/user.service");
const telegraf_1 = require("telegraf");
const requisite_service_1 = require("../requisite/requisite.service");
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
const mongoose_1 = require("mongoose");
const format_account_1 = require("../common/helpers/format-account");
let RequisiteUpdate = class RequisiteUpdate {
    constructor(userService, requisiteService) {
        this.userService = userService;
        this.requisiteService = requisiteService;
    }
    async addRequisite(ctx) {
        await ctx.reply('Выберите тип реквизита:', telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('Карта', 'create_card')],
            [telegraf_1.Markup.button.callback('Кошелек', 'create_wallet')],
        ]));
    }
    async listRequisites(ctx) {
        const requisites = await this.requisiteService.findAll();
        let message = '📋 Список реквизитов:\n\n';
        for (let index = 0; index < requisites.length; index++) {
            const req = requisites[index];
            const operator = await this.userService.findById(req.operator_id);
            message += `${index + 1}. ${req.name} (${req.type})\n`;
            message += `Номер: ${req.account_number}\n\n`;
            message += `Оператор: ${(operator === null || operator === void 0 ? void 0 : operator.username) || 'не назначен'}\n\n`;
        }
        await ctx.reply(message);
    }
    async handleRequisiteType(ctx) {
        const type = ctx.match[1];
        ctx['session'] = { creatingRequisite: { type } };
        if (type === 'card') {
            await ctx.reply('Введите данные реквизита в формате:\n' +
                'Название ФИО_владельца Номер_карты Описание\n' +
                'Пример: MBANK Иванов Иван Иванович 5536913826451234 Зарплатная карта\n' +
                '⚠️ Обязательно указывайте всё через пробелы!');
        }
        else if (type === 'wallet') {
            await ctx.reply('Введите данные кошелька в формате:\n' +
                'Название Номер_кошелька Описание\n' +
                'Пример: Bybit TYrZXyYL6i7bhhkZ2gUtQis7yVzF5qYdbv Личный кошелек\n' +
                '⚠️ Обязательно указывайте всё через пробелы!');
        }
    }
    async bindRequisiteMenu(ctx) {
        const [operators, requisites] = await Promise.all([
            this.userService.getAllOperators(),
            this.requisiteService.findAll(),
        ]);
        const buttons = requisites.length
            ? requisites.map((req) => [
                telegraf_1.Markup.button.callback(`${req.name} ${(0, format_account_1.formatAccountNumber)(req.account_number, req.type)} (${req.type})`, `select_requisite_${req._id}`),
            ])
            : [[telegraf_1.Markup.button.callback('Нет реквизитов', 'nooo')]];
        await ctx.reply('Выберите реквизит для привязки:', telegraf_1.Markup.inlineKeyboard(buttons));
    }
    async unbindRequisiteMenu(ctx) {
        const requisites = await this.requisiteService.findAll();
        const buttons = [];
        for (const requisite of requisites) {
            const operator = await this.userService.findById(requisite.operator_id);
            const displayName = (operator === null || operator === void 0 ? void 0 : operator.username) || (operator === null || operator === void 0 ? void 0 : operator.first_name) || 'Не привязан';
            buttons.push([
                telegraf_1.Markup.button.callback(`${requisite.name} ${(0, format_account_1.formatAccountNumber)(requisite.account_number, requisite.type)}  (${requisite.type}) - ${displayName}`, `unbind_requisite_${requisite._id}_${(operator === null || operator === void 0 ? void 0 : operator.username) || (operator === null || operator === void 0 ? void 0 : operator.first_name)}`),
            ]);
        }
        await ctx.reply('Выберите реквизит для отвязки:', telegraf_1.Markup.inlineKeyboard(buttons));
    }
    async unbindRequisite(ctx) {
        const requisiteId = ctx.match[1];
        console.log(ctx.match[2]);
        try {
            const requisite = await this.requisiteService.unbindFromOperator(requisiteId);
            await this.userService.removeRequisiteFromOperator(requisite.operator_id, new mongoose_1.Types.ObjectId(requisiteId));
            await ctx.editMessageText(`✅ Реквизит "${requisite.name}" отвязан от @`);
        }
        catch (e) {
            await ctx.answerCbQuery(`❌ Ошибка: ${e.message}`, { show_alert: true });
        }
    }
    async deleteRequisite(ctx) {
        const requisites = await this.requisiteService.findAll();
        const buttons = requisites.map((req) => [
            telegraf_1.Markup.button.callback(`❌ ${req.name}`, `delete_requisite_${req._id}`),
        ]);
        await ctx.reply('Выберите реквизит для удаления:', telegraf_1.Markup.inlineKeyboard(buttons));
    }
    async confirmDelete(ctx) {
        const requisiteId = ctx.match[1];
        await ctx.reply('Подтвердите удаление:', telegraf_1.Markup.inlineKeyboard([
            [
                telegraf_1.Markup.button.callback('✅ Удалить', `confirm_delete_${requisiteId}`),
                telegraf_1.Markup.button.callback('❌ Отмена', 'cancel_delete'),
            ],
        ]));
    }
    async handleDelete(ctx) {
        const requisiteId = ctx.match[1];
        try {
            await this.requisiteService.delete(requisiteId);
            await ctx.editMessageText('✅ Реквизит успешно удален');
        }
        catch (e) {
            await ctx.reply(`❌ Ошибка: ${e.message}`);
        }
    }
    async selectRequisite(ctx) {
        const requisiteId = ctx.match[1];
        const operators = await this.userService.getAllOperators();
        const buttons = operators.map((op) => [
            telegraf_1.Markup.button.callback(op.username, `bind_${requisiteId}_to_${op._id}`),
        ]);
        await ctx.editMessageText('Выберите оператора:', telegraf_1.Markup.inlineKeyboard(buttons));
    }
    async bindRequisiteToOperator(ctx) {
        const [_, requisiteId, operatorId] = ctx.match;
        try {
            const [requisite, operator] = await Promise.all([
                this.requisiteService.bindToOperator(requisiteId, operatorId),
                this.userService.addRequisiteToOperator(operatorId, requisiteId),
            ]);
            await ctx.editMessageText(`✅ Реквизит "${requisite.name}" привязан к оператору @${operator.username}`);
        }
        catch (e) {
            await ctx.reply(`❌ Ошибка привязки: ${e.message}`);
        }
    }
};
exports.RequisiteUpdate = RequisiteUpdate;
__decorate([
    (0, nestjs_telegraf_1.Command)('add_requisite'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], RequisiteUpdate.prototype, "addRequisite", null);
__decorate([
    (0, nestjs_telegraf_1.Command)('requisites'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], RequisiteUpdate.prototype, "listRequisites", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^create_(card|wallet)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RequisiteUpdate.prototype, "handleRequisiteType", null);
__decorate([
    (0, nestjs_telegraf_1.Command)('bind_requisite'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], RequisiteUpdate.prototype, "bindRequisiteMenu", null);
__decorate([
    (0, nestjs_telegraf_1.Command)('unbind_requisite'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], RequisiteUpdate.prototype, "unbindRequisiteMenu", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^unbind_requisite_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RequisiteUpdate.prototype, "unbindRequisite", null);
__decorate([
    (0, nestjs_telegraf_1.Command)('delete_requisite'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], RequisiteUpdate.prototype, "deleteRequisite", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^delete_requisite_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RequisiteUpdate.prototype, "confirmDelete", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^confirm_delete_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RequisiteUpdate.prototype, "handleDelete", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^select_requisite_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RequisiteUpdate.prototype, "selectRequisite", null);
__decorate([
    (0, nestjs_telegraf_1.Action)(/^bind_(.+)_to_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RequisiteUpdate.prototype, "bindRequisiteToOperator", null);
exports.RequisiteUpdate = RequisiteUpdate = __decorate([
    (0, nestjs_telegraf_1.Update)(),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [user_service_1.UserService,
        requisite_service_1.RequisiteService])
], RequisiteUpdate);
//# sourceMappingURL=requisite.update.js.map