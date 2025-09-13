import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { Requisite, RequisiteDocument } from '../schemas/requisite.schema';
import { GroupDocument } from '../schemas/group.schema';
import { UserService } from '../user/user.service';

@Injectable()
export class RequisiteService {
  constructor(
    @InjectModel(Requisite.name)
    private requisiteModel: Model<RequisiteDocument>,
    private readonly userService: UserService,
  ) {}

  async createRequisite(dto: any): Promise<RequisiteDocument> {
    const requisite = new this.requisiteModel({
      ...dto,
      is_active: true,
      balance: 0,
      created_at: new Date(),
    });
    return requisite.save();
  }

  async getCryptoRequisites(): Promise<RequisiteDocument[]> {
    return this.requisiteModel
      .find({
        type: 'wallet',
        is_active: true,
      })
      .exec();
  }

  async getActiveForGroup(groupId: Types.ObjectId): Promise<RequisiteDocument> {
    return this.requisiteModel.findOne({
      group: groupId,
      is_active: true,
    });
  }

  async updateBalance(
    requisiteId: string,
    amount: number,
  ): Promise<RequisiteDocument> {
    return this.requisiteModel.findByIdAndUpdate(
      requisiteId,
      { $inc: { balance: amount } },
      { new: true },
    );
  }

  async create(dto: any): Promise<RequisiteDocument> {
    const exists = await this.requisiteModel.findOne({
      account_number: dto.account_number,
    });

    if (exists) {
      throw new Error('Реквизит с таким номером уже существует');
    }

    return this.requisiteModel.create({
      ...dto,
      is_active: true,
    });
  }

  // Редактирование реквизита
  async update(id: string, dto: any): Promise<RequisiteDocument> {
    const requisite = await this.requisiteModel.findById(id);

    if (requisite.operator_id && dto.operator_id) {
      throw new Error('Нельзя изменить привязанного оператора');
    }

    return this.requisiteModel.findByIdAndUpdate(id, dto, { new: true });
  }

  async delete(id: string): Promise<RequisiteDocument> {
    return this.requisiteModel.findByIdAndUpdate(
      id,
      { is_active: false },
      { new: true },
    );
  }

  async getRequisiteBalance(requisiteId: string): Promise<number> {
    const requisite = await this.requisiteModel.findById(requisiteId);
    return requisite.balance;
  }

  async getActiveRequisitesForGroup(
    groupId: Types.ObjectId,
  ): Promise<RequisiteDocument[]> {
    return this.requisiteModel.find({
      is_active: true,
    });
  }

  async getActiveRequisitesForOperator(operatorId: Types.ObjectId | string) {
    return this.requisiteModel
      .find({
        operator_id: operatorId,
        is_active: true,
      })
      .exec();
  }

  async addRequisiteToGroup(
    groupId: Types.ObjectId,
    requisiteId: string,
  ): Promise<GroupDocument> {
    return this.requisiteModel.findByIdAndUpdate(
      requisiteId,
      { group_id: groupId },
      { new: true },
    );
  }

  async getAllActive() {
    return this.requisiteModel.find({ is_active: true, type: 'card' }).exec();
  }
  // Получение всех реквизитов
  // async findAll(
  //   page = 1,
  //   limit = 10,
  // ): Promise<{ data: RequisiteDocument[]; total: number }> {
  //   const [data, total] = await Promise.all([
  //     this.requisiteModel
  //       .find({ is_active: true })
  //       .skip((page - 1) * limit)
  //       .limit(limit)
  //       .populate('operator_id')
  //       .exec(),
  //     this.requisiteModel.countDocuments(),
  //   ]);
  //
  //   return { data, total };
  // }

  async findAll(): Promise<RequisiteDocument[]> {
    return this.requisiteModel.find().populate('operator_id').exec();
  }

  async findByOperator(
    operatorId: Types.ObjectId | string,
  ): Promise<RequisiteDocument[]> {
    return this.requisiteModel
      .find({
        operator_id: new Types.ObjectId(operatorId),
      })
      .exec();
  }

  async toggleActive(requisiteId: string) {
    const requisite = await this.requisiteModel.findById(requisiteId);
    requisite.is_active = !requisite.is_active;
    await requisite.save();
    return requisite;
  }

  async findByIds(ids: Types.ObjectId[] | string[]) {
    return this.requisiteModel.find({
      _id: { $in: ids },
    });
  }

  async bindToOperator(
    requisiteId: string,
    operatorId: string,
  ): Promise<RequisiteDocument> {
    return this.requisiteModel.findByIdAndUpdate(
      requisiteId,
      {
        operator_id: new Types.ObjectId(operatorId),
        is_active: true,
      },
      { new: true },
    );
  }

  async unbindFromOperator(requisiteId: string): Promise<RequisiteDocument> {
    return this.requisiteModel.findByIdAndUpdate(
      requisiteId,
      {
        $unset: { operator_id: 1 },
        is_active: false,
      },
      { new: true },
    );
  }

  async findById(id: Types.ObjectId | string): Promise<RequisiteDocument> {
    return this.requisiteModel.findById(id).exec();
  }

  async getOperatorRequisites(
    operatorId: string,
  ): Promise<RequisiteDocument[]> {
    return this.requisiteModel.find({
      operator_id: operatorId,
      is_active: true,
    });
  }

  async resetRequisiteBalance(requisiteId: string, balance: number) {
    return this.requisiteModel
      .findByIdAndUpdate(requisiteId, { $set: { balance: 0 } }, { new: true })
      .exec();
  }

  async decreaseRequisiteBalance(requisiteId: string, amount: number) {
    return this.requisiteModel
      .findByIdAndUpdate(
        requisiteId,
        { $inc: { balance: -amount } },
        { new: true },
      )
      .exec();
  }

  async withdrawFromRequisite(
    operatorId: Types.ObjectId,
    requisiteId: Types.ObjectId,
    amount: number,
  ): Promise<Requisite> {
    const requisite = await this.requisiteModel.findOne({
      _id: requisiteId,
      operatorId,
    });

    if (!requisite) throw new NotFoundException('Реквизит не найден');
    if (requisite.balance < amount)
      throw new BadRequestException('Недостаточно средств');

    requisite.balance -= amount;
    await requisite.save();

    await this.userService.findByIdAndUpdate(operatorId, {
      $inc: { balance: -amount },
    });

    return requisite;
  }

  async getAvailableRequisites(): Promise<RequisiteDocument[]> {
    return this.requisiteModel.find({
      $or: [{ group_id: { $exists: false } }, { group_id: null }],
      is_active: true,
    });
  }

  async getUnboundRequisites(): Promise<RequisiteDocument[]> {
    return this.requisiteModel.find({
      operator_id: { $exists: false },
      is_active: true,
    });
  }
}
