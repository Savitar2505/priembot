import * as mongoose from 'mongoose';
import { Types } from 'mongoose';
export declare enum UserRole {
    ADMIN = "admin",
    OPERATOR = "operator",
    USER = "user"
}
export declare class User {
    _id: Types.ObjectId;
    username: string;
    first_name: string;
    telegram_id: number;
    role: UserRole;
    is_active?: boolean;
    requisites?: Types.ObjectId[];
    groups?: Types.ObjectId[];
    balance?: number;
}
export type UserDocument = User & mongoose.Document;
export declare const UserSchema: mongoose.Schema<User, mongoose.Model<User, any, any, any, mongoose.Document<unknown, any, User, any> & User & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, User, mongoose.Document<unknown, {}, mongoose.FlatRecord<User>, {}> & mongoose.FlatRecord<User> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
