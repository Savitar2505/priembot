import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Requisite, RequisiteDocument } from '../schemas/requisite.schema';
import { Withdraw, WithdrawDocument } from '../schemas/withdraw.schema';

@Injectable()
export class WithdrawService {
  constructor(
    @InjectModel(Withdraw.name)
    private withdrawModel: Model<WithdrawDocument>,
  ) {}

  async create(createDto: any): Promise<WithdrawDocument> {
    const createdRequest = new this.withdrawModel({
      ...createDto,
      status: 'PENDING', // Статус по умолчанию
      createdAt: new Date(),
    });

    // Дополнительные проверки
    if (createDto.amount <= 0) {
      throw new BadRequestException('Сумма должна быть положительной');
    }

    return createdRequest.save();
  }
  async approve(
    id: string,
    adminId: Types.ObjectId | string,
    amountUsdt?: null | number,
  ) {
    return this.withdrawModel
      .findByIdAndUpdate(
        id,
        {
          status: 'APPROVED',
          admin: adminId,
          amount_usdt: amountUsdt,
          $unset: { rejectReason: 1 },
        },
        { new: true },
      )
      .populate('operator', 'username telegram_id') // Правильное поле для populate
      .populate('admin', 'username');
  }

  async reject(id: string, adminId: Types.ObjectId | string, reason?: string) {
    const updates: any = {
      status: 'REJECTED',
      admin: new Types.ObjectId(adminId),
    };

    if (reason) updates.rejectReason = reason;

    return this.withdrawModel
      .findByIdAndUpdate(id, updates, { new: true })
      .populate('operator', 'username telegram_id')
      .populate('admin', 'username');
  }

  async findById(id: Types.ObjectId | string) {
    return this.withdrawModel.findById(id).exec();
  }
}
