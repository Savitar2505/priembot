import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  USER = 'user',
}

@Schema({
  collection: 'users',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class User {
  _id: Types.ObjectId;

  @Prop({ type: String })
  username: string;

  @Prop({ type: String })
  first_name: string;

  @Prop({ type: Number, required: true, unique: true })
  telegram_id: number;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ type: Boolean, default: true })
  is_active?: boolean;

  @Prop({ type: [Types.ObjectId], ref: 'Requisite', default: [] })
  requisites?: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'Group', default: [] })
  groups?: Types.ObjectId[];

  @Prop({ type: Number, default: 0 })
  balance?: number;
}

export type UserDocument = User & mongoose.Document;

export const UserSchema = SchemaFactory.createForClass(User);
