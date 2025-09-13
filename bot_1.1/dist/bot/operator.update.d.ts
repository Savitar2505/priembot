import { UserService } from 'src/user/user.service';
import { Context } from 'telegraf';
import { RequisiteService } from '../requisite/requisite.service';
import { WithdrawService } from '../withdraw/withdraw.service';
export declare class OperatorUpdate {
    private readonly userService;
    private readonly requisitesService;
    private readonly withdrawService;
    constructor(userService: UserService, requisitesService: RequisiteService, withdrawService: WithdrawService);
    operatorsMenu(ctx: Context): Promise<void>;
    addOperator(ctx: Context): Promise<import("@telegraf/types").Message.TextMessage>;
    makeOperator(ctx: Context): Promise<import("@telegraf/types").Message.TextMessage>;
    removeOperatorMenu(ctx: Context): Promise<void>;
    removeOperatorAction(ctx: Context): Promise<void>;
    listOperators(ctx: Context): Promise<void>;
    handleWithdrawCommand(ctx: Context): Promise<import("@telegraf/types").Message.TextMessage>;
    handleWithdrawRequisite(ctx: Context & {
        match: RegExpExecArray;
    }): Promise<void>;
    private checkAdmin;
}
