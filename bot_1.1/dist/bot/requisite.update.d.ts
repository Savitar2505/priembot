import { UserService } from 'src/user/user.service';
import { Context } from 'telegraf';
import { RequisiteService } from '../requisite/requisite.service';
export declare class RequisiteUpdate {
    private readonly userService;
    private readonly requisiteService;
    constructor(userService: UserService, requisiteService: RequisiteService);
    addRequisite(ctx: Context): Promise<void>;
    listRequisites(ctx: Context): Promise<void>;
    handleRequisiteType(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    bindRequisiteMenu(ctx: Context): Promise<void>;
    unbindRequisiteMenu(ctx: Context): Promise<void>;
    unbindRequisite(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    deleteRequisite(ctx: Context): Promise<void>;
    confirmDelete(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    handleDelete(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    selectRequisite(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    bindRequisiteToOperator(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
}
