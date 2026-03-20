import { Module } from '@nestjs/common';
import { AdminPengajuanController } from './pengajuan/admin-pengajuan.controller';
import { AdminPengajuanService } from './pengajuan/admin-pengajuan.service';
import { AdminFasilitasiController } from './fasilitasi/admin-fasilitasi.controller';
import { AdminFasilitasiService } from './fasilitasi/admin-fasilitasi.service';
import { AdminAccountController } from './pengaturan-akun/admin-account.controller';
import { AdminAccountService } from './pengaturan-akun/admin-account.service';
import { AdminPengajuanAssertionService } from './pengajuan/services/admin-pengajuan-assertion.service';
import { AdminPengajuanNotifierService } from './pengajuan/services/admin-pengajuan-notifier.service';
import { AdminPengajuanQueryService } from './pengajuan/services/admin-pengajuan-query.service';
import { AdminPengajuanTimelineService } from './pengajuan/services/admin-pengajuan-timeline.service';

@Module({
  controllers: [
    AdminPengajuanController,
    AdminFasilitasiController,
    AdminAccountController,
  ],
  providers: [
    AdminPengajuanService,
    AdminPengajuanQueryService,
    AdminPengajuanAssertionService,
    AdminPengajuanNotifierService,
    AdminPengajuanTimelineService,
    AdminFasilitasiService,
    AdminAccountService,
  ],
})
export class AdminModule {}
