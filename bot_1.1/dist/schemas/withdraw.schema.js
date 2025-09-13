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
exports.WithdrawSchema = exports.Withdraw = exports.WithdrawStatuses = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
var WithdrawStatuses;
(function (WithdrawStatuses) {
    WithdrawStatuses["PENDING"] = "PENDING";
    WithdrawStatuses["APPROVED"] = "APPROVED";
    WithdrawStatuses["REJECTED"] = "REJECTED";
})(WithdrawStatuses || (exports.WithdrawStatuses = WithdrawStatuses = {}));
let Withdraw = class Withdraw {
};
exports.Withdraw = Withdraw;
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['OPERATOR', 'GROUP'],
        required: true,
    }),
    __metadata("design:type", String)
], Withdraw.prototype, "target_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'User',
        required: false,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Withdraw.prototype, "operator", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'Requisite',
        required: false,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Withdraw.prototype, "requisite", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: 'Group',
        required: false,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Withdraw.prototype, "group", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], Withdraw.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: false }),
    __metadata("design:type", Number)
], Withdraw.prototype, "amount_usdt", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: WithdrawStatuses,
        default: WithdrawStatuses.PENDING,
    }),
    __metadata("design:type", String)
], Withdraw.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Withdraw.prototype, "admin", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Withdraw.prototype, "reject_reason", void 0);
exports.Withdraw = Withdraw = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'withdraws',
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    })
], Withdraw);
exports.WithdrawSchema = mongoose_1.SchemaFactory.createForClass(Withdraw);
//# sourceMappingURL=withdraw.schema.js.map