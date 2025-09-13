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
exports.AdminUpdate = void 0;
const nestjs_telegraf_1 = require("nestjs-telegraf");
const user_service_1 = require("../user/user.service");
const group_service_1 = require("../group/group.service");
const requisite_service_1 = require("../requisite/requisite.service");
const admin_guard_1 = require("../common/guards/admin.guard");
const common_1 = require("@nestjs/common");
const withdraw_service_1 = require("../withdraw/withdraw.service");
const operation_service_1 = require("../operation/operation.service");
let AdminUpdate = class AdminUpdate {
    constructor(userService, groupService, requisiteService, withdrawService, operationService) {
        this.userService = userService;
        this.groupService = groupService;
        this.requisiteService = requisiteService;
        this.withdrawService = withdrawService;
        this.operationService = operationService;
    }
};
exports.AdminUpdate = AdminUpdate;
exports.AdminUpdate = AdminUpdate = __decorate([
    (0, nestjs_telegraf_1.Update)(),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [user_service_1.UserService,
        group_service_1.GroupService,
        requisite_service_1.RequisiteService,
        withdraw_service_1.WithdrawService,
        operation_service_1.OperationService])
], AdminUpdate);
//# sourceMappingURL=admin.update.js.map