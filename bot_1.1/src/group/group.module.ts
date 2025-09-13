import {Module} from "@nestjs/common";
import {MongooseModule} from "@nestjs/mongoose";
import {UserModule} from "../user/user.module";
import {RequisiteModule} from "../requisite/requisite.module";
import {GroupService} from "./group.service";
import {GroupSchema} from "../schemas/group.schema";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Group', schema: GroupSchema }]),
        UserModule,
        RequisiteModule,
    ],
    providers: [GroupService],
    exports: [GroupService],
})
export class GroupModule {}
