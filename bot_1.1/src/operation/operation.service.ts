import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Operation,
  OperationDocument,
  OperationStatuses,
} from '../schemas/operation.schema';

@Injectable()
export class OperationService {
  constructor(
    @InjectModel(Operation.name)
    private readonly operationModel: Model<OperationDocument>,
  ) {}

  async create(operationData: Partial<Operation>) {
    const created = new this.operationModel(operationData);
    return created.save();
  }

  async findById(id: string) {
    return this.operationModel.findById(id).exec();
  }

  async findPendingOperationById(id: Types.ObjectId | string) {
    return this.operationModel
      .findOne({
        _id: id,
        status: OperationStatuses.PENDING,
      })
      .exec();
  }

  async findPending(operatorId: Types.ObjectId | string) {
    return this.operationModel
      .find({ operator_id: operatorId, status: OperationStatuses.PENDING })
      .exec();
  }

  async delete(id: string) {
    return this.operationModel.findByIdAndDelete(id).exec();
  }

  async update(id: Types.ObjectId | string, dto: any) {
    return this.operationModel.findByIdAndUpdate(id, dto, { new: true });
  }

  async approve(id: Types.ObjectId | string) {
    return this.operationModel
      .findByIdAndUpdate(id, {
        status: OperationStatuses.APPROVED,
      })
      .exec();
  }

  async reject(id: Types.ObjectId | string) {
    return this.operationModel
      .findByIdAndUpdate(id, {
        status: OperationStatuses.REJECTED,
      })
      .exec();
  }
}
