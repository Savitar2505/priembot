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
exports.RequisiteService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const requisite_schema_1 = require("../schemas/requisite.schema");
const user_service_1 = require("../user/user.service");
let RequisiteService = class RequisiteService {
    constructor(requisiteModel, userService) {
        this.requisiteModel = requisiteModel;
        this.userService = userService;
    }
    async createRequisite(dto) {
        const requisite = new this.requisiteModel(Object.assign(Object.assign({}, dto), { is_active: true, balance: 0, created_at: new Date() }));
        return requisite.save();
    }
    async getCryptoRequisites() {
        return this.requisiteModel
            .find({
            type: 'wallet',
            is_active: true,
        })
            .exec();
    }
    async getActiveForGroup(groupId) {
        return this.requisiteModel.findOne({
            group: groupId,
            is_active: true,
        });
    }
    async updateBalance(requisiteId, amount) {
        return this.requisiteModel.findByIdAndUpdate(requisiteId, { $inc: { balance: amount } }, { new: true });
    }
    async create(dto) {
        const exists = await this.requisiteModel.findOne({
            account_number: dto.account_number,
        });
        if (exists) {
            throw new Error('Реквизит с таким номером уже существует');
        }
        return this.requisiteModel.create(Object.assign(Object.assign({}, dto), { is_active: true }));
    }
    async update(id, dto) {
        const requisite = await this.requisiteModel.findById(id);
        if (requisite.operator_id && dto.operator_id) {
            throw new Error('Нельзя изменить привязанного оператора');
        }
        return this.requisiteModel.findByIdAndUpdate(id, dto, { new: true });
    }
    async delete(id) {
        return this.requisiteModel.findByIdAndUpdate(id, { is_active: false }, { new: true });
    }
    async getRequisiteBalance(requisiteId) {
        const requisite = await this.requisiteModel.findById(requisiteId);
        return requisite.balance;
    }
    async getActiveRequisitesForGroup(groupId) {
        return this.requisiteModel.find({
            is_active: true,
        });
    }
    async getActiveRequisitesForOperator(operatorId) {
        return this.requisiteModel
            .find({
            operator_id: operatorId,
            is_active: true,
        })
            .exec();
    }
    async addRequisiteToGroup(groupId, requisiteId) {
        return this.requisiteModel.findByIdAndUpdate(requisiteId, { group_id: groupId }, { new: true });
    }
    async getAllActive() {
        return this.requisiteModel.find({ is_active: true, type: 'card' }).exec();
    }
    async findAll() {
        return this.requisiteModel.find().populate('operator_id').exec();
    }
    async findByOperator(operatorId) {
        return this.requisiteModel
            .find({
            operator_id: new mongoose_2.Types.ObjectId(operatorId),
        })
            .exec();
    }
    async toggleActive(requisiteId) {
        const requisite = await this.requisiteModel.findById(requisiteId);
        requisite.is_active = !requisite.is_active;
        await requisite.save();
        return requisite;
    }
    async findByIds(ids) {
        return this.requisiteModel.find({
            _id: { $in: ids },
        });
    }
    async bindToOperator(requisiteId, operatorId) {
        return this.requisiteModel.findByIdAndUpdate(requisiteId, {
            operator_id: new mongoose_2.Types.ObjectId(operatorId),
            is_active: true,
        }, { new: true });
    }
    async unbindFromOperator(requisiteId) {
        return this.requisiteModel.findByIdAndUpdate(requisiteId, {
            $unset: { operator_id: 1 },
            is_active: false,
        }, { new: true });
    }
    async findById(id) {
        return this.requisiteModel.findById(id).exec();
    }
    async getOperatorRequisites(operatorId) {
        return this.requisiteModel.find({
            operator_id: operatorId,
            is_active: true,
        });
    }
    async resetRequisiteBalance(requisiteId, balance) {
        return this.requisiteModel
            .findByIdAndUpdate(requisiteId, { $set: { balance: 0 } }, { new: true })
            .exec();
    }
    async decreaseRequisiteBalance(requisiteId, amount) {
        return this.requisiteModel
            .findByIdAndUpdate(requisiteId, { $inc: { balance: -amount } }, { new: true })
            .exec();
    }
    async withdrawFromRequisite(operatorId, requisiteId, amount) {
        const requisite = await this.requisiteModel.findOne({
            _id: requisiteId,
            operatorId,
        });
        if (!requisite)
            throw new common_1.NotFoundException('Реквизит не найден');
        if (requisite.balance < amount)
            throw new common_1.BadRequestException('Недостаточно средств');
        requisite.balance -= amount;
        await requisite.save();
        await this.userService.findByIdAndUpdate(operatorId, {
            $inc: { balance: -amount },
        });
        return requisite;
    }
    async getAvailableRequisites() {
        return this.requisiteModel.find({
            $or: [{ group_id: { $exists: false } }, { group_id: null }],
            is_active: true,
        });
    }
    async getUnboundRequisites() {
        return this.requisiteModel.find({
            operator_id: { $exists: false },
            is_active: true,
        });
    }
};
exports.RequisiteService = RequisiteService;
exports.RequisiteService = RequisiteService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(requisite_schema_1.Requisite.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        user_service_1.UserService])
], RequisiteService);
//# sourceMappingURL=requisite.service.js.map