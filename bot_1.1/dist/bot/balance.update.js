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
exports.BalanceUpdate = void 0;
const nestjs_telegraf_1 = require("nestjs-telegraf");
const user_service_1 = require("../user/user.service");
const telegraf_1 = require("telegraf");
const group_service_1 = require("../group/group.service");
const requisite_service_1 = require("../requisite/requisite.service");
const admin_guard_1 = require("../common/guards/admin.guard");
const common_1 = require("@nestjs/common");
let BalanceUpdate = class BalanceUpdate {
    constructor(groupService, userService, requisiteService) {
        this.groupService = groupService;
        this.userService = userService;
        this.requisiteService = requisiteService;
    }
    async showBalanceMenu(ctx) {
        const buttons = [
            [telegraf_1.Markup.button.callback('🏢 По группам', 'balance_groups')],
            [telegraf_1.Markup.button.callback('👤 По операторам', 'balance_operators')],
            [telegraf_1.Markup.button.callback('💳 По реквизитам', 'balance_requisites')],
        ];
        await ctx.reply('Выберите тип баланса:', telegraf_1.Markup.inlineKeyboard(buttons));
    }
    async showGroupsBalance(ctx) {
        const groups = await this.groupService.getAllGroups();
        const message = groups.map((g) => `${g.title}: ${g.balance}`).join('\n');
        await ctx.editMessageText(`Балансы групп:\n\n${message}`);
    }
    async showOperatorsBalance(ctx) {
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
    async showRequisitesBalance(ctx) {
        const requisites = await this.requisiteService.getAllActive();
        const message = requisites
            .map((r) => `${r.name} (${r.type}): ${r.balance}`)
            .join('\n');
        await ctx.editMessageText(`Балансы реквизитов:\n\n${message}`);
    }
};
exports.BalanceUpdate = BalanceUpdate;
__decorate([
    (0, nestjs_telegraf_1.Command)('balance'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BalanceUpdate.prototype, "showBalanceMenu", null);
__decorate([
    (0, nestjs_telegraf_1.Action)('balance_groups'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BalanceUpdate.prototype, "showGroupsBalance", null);
__decorate([
    (0, nestjs_telegraf_1.Action)('balance_operators'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BalanceUpdate.prototype, "showOperatorsBalance", null);
__decorate([
    (0, nestjs_telegraf_1.Action)('balance_requisites'),
    __param(0, (0, nestjs_telegraf_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [telegraf_1.Context]),
    __metadata("design:returntype", Promise)
], BalanceUpdate.prototype, "showRequisitesBalance", null);
exports.BalanceUpdate = BalanceUpdate = __decorate([
    (0, nestjs_telegraf_1.Update)(),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [group_service_1.GroupService,
        user_service_1.UserService,
        requisite_service_1.RequisiteService])
], BalanceUpdate);
//# sourceMappingURL=balance.update.js.map