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
exports.OperationService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const operation_schema_1 = require("../schemas/operation.schema");
let OperationService = class OperationService {
    constructor(operationModel) {
        this.operationModel = operationModel;
    }
    async create(operationData) {
        const created = new this.operationModel(operationData);
        return created.save();
    }
    async findById(id) {
        return this.operationModel.findById(id).exec();
    }
    async findPendingOperationById(id) {
        return this.operationModel
            .findOne({
            _id: id,
            status: operation_schema_1.OperationStatuses.PENDING,
        })
            .exec();
    }
    async findPending(operatorId) {
        return this.operationModel
            .find({ operator_id: operatorId, status: operation_schema_1.OperationStatuses.PENDING })
            .exec();
    }
    async delete(id) {
        return this.operationModel.findByIdAndDelete(id).exec();
    }
    async update(id, dto) {
        return this.operationModel.findByIdAndUpdate(id, dto, { new: true });
    }
    async approve(id) {
        return this.operationModel
            .findByIdAndUpdate(id, {
            status: operation_schema_1.OperationStatuses.APPROVED,
        })
            .exec();
    }
    async reject(id) {
        return this.operationModel
            .findByIdAndUpdate(id, {
            status: operation_schema_1.OperationStatuses.REJECTED,
        })
            .exec();
    }
};
exports.OperationService = OperationService;
exports.OperationService = OperationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(operation_schema_1.Operation.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], OperationService);
//# sourceMappingURL=operation.service.js.map