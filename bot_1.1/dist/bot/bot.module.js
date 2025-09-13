"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotModule = void 0;
const common_1 = require("@nestjs/common");
const nestjs_telegraf_1 = require("nestjs-telegraf");
const bot_update_1 = require("./bot.update");
const bot_config_1 = require("../configs/bot.config");
const user_module_1 = require("../user/user.module");
const group_module_1 = require("../group/group.module");
const requisite_module_1 = require("../requisite/requisite.module");
const operator_update_1 = require("./operator.update");
const requisite_update_1 = require("./requisite.update");
const group_update_1 = require("./group.update");
const balance_update_1 = require("./balance.update");
const withdraw_module_1 = require("../withdraw/withdraw.module");
const operation_module_1 = require("../operation/operation.module");
let BotModule = class BotModule {
};
exports.BotModule = BotModule;
exports.BotModule = BotModule = __decorate([
    (0, common_1.Module)({
        imports: [
            nestjs_telegraf_1.TelegrafModule.forRootAsync((0, bot_config_1.botOptions)()),
            user_module_1.UserModule,
            group_module_1.GroupModule,
            requisite_module_1.RequisiteModule,
            withdraw_module_1.WithdrawModule,
            operation_module_1.OperationModule,
        ],
        controllers: [],
        providers: [
            operator_update_1.OperatorUpdate,
            group_update_1.GroupUpdate,
            balance_update_1.BalanceUpdate,
            requisite_update_1.RequisiteUpdate,
            bot_update_1.BotUpdate,
        ],
    })
], BotModule);
//# sourceMappingURL=bot.module.js.map