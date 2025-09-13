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
exports.OperationSchema = exports.Operation = exports.OperationStatuses = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
var OperationStatuses;
(function (OperationStatuses) {
    OperationStatuses["PENDING"] = "PENDING";
    OperationStatuses["APPROVED"] = "APPROVED";
    OperationStatuses["REJECTED"] = "REJECTED";
})(OperationStatuses || (exports.OperationStatuses = OperationStatuses = {}));
let Operation = class Operation extends mongoose_2.Document {
};
exports.Operation = Operation;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Operation.prototype, "group_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Operation.prototype, "requisite_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Operation.prototype, "group_chat_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Operation.prototype, "original_message_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Operation.prototype, "group_message_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Operation.prototype, "operator_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Operation.prototype, "photo_file_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Operation.prototype, "document_file_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: OperationStatuses,
        default: OperationStatuses.PENDING,
    }),
    __metadata("design:type", String)
], Operation.prototype, "status", void 0);
exports.Operation = Operation = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'operations',
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    })
], Operation);
exports.OperationSchema = mongoose_1.SchemaFactory.createForClass(Operation);
//# sourceMappingURL=operation.schema.js.map