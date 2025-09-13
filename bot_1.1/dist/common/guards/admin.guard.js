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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminGuard = void 0;
const common_1 = require("@nestjs/common");
const nestjs_telegraf_1 = require("nestjs-telegraf");
const user_service_1 = require("../../user/user.service");
const user_schema_1 = require("../../schemas/user.schema");
let AdminGuard = class AdminGuard {
    constructor(userService) {
        this.userService = userService;
    }
    async canActivate(context) {
        const ctx = nestjs_telegraf_1.TelegrafExecutionContext.create(context);
        const context1 = ctx.getContext();
        try {
            const user = await this.userService.getUserByTelegramId(context1.from.id);
            if (user.role !== user_schema_1.UserRole.ADMIN) {
                await context1.reply('🚫 Доступ только для администраторов!');
                return false;
            }
            return true;
        }
        catch (e) {
            await context1.reply('❌ Пользователь не найден!');
            return false;
        }
    }
};
exports.AdminGuard = AdminGuard;
exports.AdminGuard = AdminGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService])
], AdminGuard);
//# sourceMappingURL=admin.guard.js.map