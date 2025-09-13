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
exports.GroupUpdate = void 0;
const nestjs_telegraf_1 = require("nestjs-telegraf");
const user_service_1 = require("../user/user.service");
const telegraf_1 = require("telegraf");
const group_service_1 = require("../group/group.service");
const requisite_service_1 = require("../requisite/requisite.service");
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
let GroupUpdate = class GroupUpdate {
    constructor(groupService, userService, requisiteService) {
        this.groupService = groupService;
        this.userService = userService;
        this.requisiteService = requisiteService;
    }
    async listGroups(ctx) {
        const groups = await this.groupService.getAllGroups();
        const buttons = groups.map((group) => [
            telegraf_1.Markup.button.callback(group.title, `group_action_${group.telegram_group_id}`),
        ]);
        await ctx.reply('📂 Список групп:', telegraf_1.Markup.inlineKeyboard(buttons));
    }
    async groupActionsMenu(ctx) {
        const groupId = ctx.match[1];
        const group = await this.groupService.findByTelegramId(parseInt(groupId));
        const buttons = [
            [
                telegraf_1.Markup.button.callback('✏️ Изменить название', `rename_group_${groupId}`),
            ],
            [
                telegraf_1.Markup.button.callback('👥 Привязать оператора', `bind_operator_${groupId}`),
            ],
        ];
        await ctx.editMessageText(`⚙️ Управление группой: ${group.title}\n` +
            `Операторов: ${group.operator_ids.length}`, telegraf_1.Markup.inlineKeyboard(buttons));
    }
    async handleBalanceCommand(ctx) {
        if (ctx.chat.type === 'private') {
            return ctx.reply('ℹ️ Эта команда доступна только в группах');
        }
        try {
            const group = await this.groupService.getGroupBalance(ctx.chat.id.toString());
            if (!group) {
                return ctx.reply('❌ Группа не зарегистрирована');
            }
            const message = `💰 Текущий баланс группы: ${group.balance}\n`;
            await ctx.reply(message);
        }
        catch (e) {
            await ctx.reply(`❌ Ошибка: ${e.message}`);
        }
    }
    async handleResetBalance(ctx) {
        try {
            if (ctx.chat.type === 'private') {
                return ctx.reply('ℹ️ Эта команда доступна только в группах');
            }
            const group = await this.groupService.resetGroupBalance(ctx.chat.id.toString());
            await ctx.reply(`✅ Баланс группы обнулен\n` + `Новый баланс: 0 \n`);
        }
        catch (e) {
            await ctx.reply(`❌ Ошибка: ${e.message}`);
        }
    }
    async bindRequisiteToGroup(ctx) {
        const groupId = ctx.match[1];
        const requisites = await this.requisiteService.getAvailableRequisites();
        const buttons = requisites.length
            ? requisites.map((req) => [
                telegraf_1.Markup.button.callback(`${req.name} (${req.type})`, `select_requisite_${groupId}_${req._id}`),
            ])
            : [[telegraf_1.Markup.button.callback('Нет Доступных реквизитов', 'noop')]];
        await ctx.editMessageText('Выберите реквизит для привязки:', telegraf_1.Markup.inlineKeyboard(buttons));
    }
    async processRequisiteSelection(ctx) {
        const [_, telegramGroupId, requisiteId] = ctx.match;
        try {
            const groupId = await this.groupService.findByTelegramId(parseInt(telegramGroupId));
            await this.groupService.addRequisiteToGroup(telegramGroupId, requisiteId);
            await this.requisiteService.addRequisiteToGroup(groupId._id, requisiteId);
            await ctx.editMessageText('✅ Реквизит успешно привязан!');
        }
        catch (e) {
            await ctx.editMessageText(`❌ Ошибка: ${e.message}`);
        }
    }
    async renameGroup(ctx) {
        const groupId = ctx.match[1];
        ctx['session'] = { action: 'renaming_group', groupId };
        await ctx.reply('Введите новое название группы:', telegraf_1.Markup.removeKeyboard());
    }
    async bindOperatorToGroup(ctx) {
        const groupId = ctx.match[1];
        const group = await this.groupService.findByTelegramId(groupId);
        const operators = await this.userService.getOperatorsWithGroupBinding(group._id);
        const buttons = operators.map((op) => {
            const status = op.isBound ? '🔗' : '❌';
            return [
                telegraf_1.Markup.button.callback(`${op.username} ${status}`, `select_operator_${groupId}_${op._id}`),
            ];
        });
        await ctx.editMessageText('Выберите оператора:', telegraf_1.Markup.inlineKeyboard(buttons));
    }
    async processOperatorSelection(ctx) {
        const [_, telegramGroupId, operatorId] = ctx.match;
        const group = await this.groupService.findByTelegramId(telegramGroupId);
        const isBound = await this.userService.isOperatorBoundToGroup(operatorId, group._id);
        if (isBound) {
            await this.groupService.removeOperatorFromGroup(telegramGroupId, operatorId);
            await this.userService.unbindOperatorFromGroup(group._id, operatorId);
            await ctx.editMessageText('❌ Оператор отвязан от группы.');
        }
        else {
            await this.groupService.addOperatorToGroup(telegramGroupId, operatorId);
            await this.userService.bindOperatorToGroup(group._id, operatorId);
            await ctx.editMessageText('✅ Оператор успешно привязан к группе.');
        }
    }
};
exports.GroupUpdate = GroupUpdate;
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, nestjs_telegraf_1.Command)('all_groups'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], GroupUpdate.prototype, "listGroups", null);
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, nestjs_telegraf_1.Action)(/^group_action_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GroupUpdate.prototype, "groupActionsMenu", null);
__decorate([
    (0, nestjs_telegraf_1.Command)('group_balance'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], GroupUpdate.prototype, "handleBalanceCommand", null);
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, nestjs_telegraf_1.Command)('reset_balance'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], GroupUpdate.prototype, "handleResetBalance", null);
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, nestjs_telegraf_1.Action)(/^bind_requisite_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GroupUpdate.prototype, "bindRequisiteToGroup", null);
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, nestjs_telegraf_1.Action)(/^select_requisite_(.+)_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GroupUpdate.prototype, "processRequisiteSelection", null);
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, nestjs_telegraf_1.Action)(/^rename_group_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GroupUpdate.prototype, "renameGroup", null);
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, nestjs_telegraf_1.Action)(/^bind_operator_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GroupUpdate.prototype, "bindOperatorToGroup", null);
__decorate([
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, nestjs_telegraf_1.Action)(/^select_operator_(.+)_(.+)$/),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GroupUpdate.prototype, "processOperatorSelection", null);
exports.GroupUpdate = GroupUpdate = __decorate([
    (0, nestjs_telegraf_1.Update)(),
    __metadata("design:paramtypes", [group_service_1.GroupService,
        user_service_1.UserService,
        requisite_service_1.RequisiteService])
], GroupUpdate);
//# sourceMappingURL=group.update.js.map