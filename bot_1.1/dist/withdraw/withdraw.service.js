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
exports.WithdrawService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const withdraw_schema_1 = require("../schemas/withdraw.schema");
let WithdrawService = class WithdrawService {
    constructor(withdrawModel) {
        this.withdrawModel = withdrawModel;
    }
    async create(createDto) {
        const createdRequest = new this.withdrawModel(Object.assign(Object.assign({}, createDto), { status: 'PENDING', createdAt: new Date() }));
        if (createDto.amount <= 0) {
            throw new common_1.BadRequestException('Сумма должна быть положительной');
        }
        return createdRequest.save();
    }
    async approve(id, adminId, amountUsdt) {
        return this.withdrawModel
            .findByIdAndUpdate(id, {
            status: 'APPROVED',
            admin: adminId,
            amount_usdt: amountUsdt,
            $unset: { rejectReason: 1 },
        }, { new: true })
            .populate('operator', 'username telegram_id')
            .populate('admin', 'username');
    }
    async reject(id, adminId, reason) {
        const updates = {
            status: 'REJECTED',
            admin: new mongoose_2.Types.ObjectId(adminId),
        };
        if (reason)
            updates.rejectReason = reason;
        return this.withdrawModel
            .findByIdAndUpdate(id, updates, { new: true })
            .populate('operator', 'username telegram_id')
            .populate('admin', 'username');
    }
    async findById(id) {
        return this.withdrawModel.findById(id).exec();
    }
};
exports.WithdrawService = WithdrawService;
exports.WithdrawService = WithdrawService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(withdraw_schema_1.Withdraw.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], WithdrawService);
//# sourceMappingURL=withdraw.service.js.map