import { Module } from '@nestjs/common';
import { AdminPengajuanController } from './pengajuan/admin-pengajuan.controller';
import { AdminPengajuanService } from './pengajuan/admin-pengajuan.service';
import { AdminFasilitasiController } from './fasilitasi/admin-fasilitasi.controller';
import { AdminFasilitasiService } from './fasilitasi/admin-fasilitasi.service';

@Module({
  controllers: [AdminPengajuanController, AdminFasilitasiController],
  providers: [AdminPengajuanService, AdminFasilitasiService],
})
export class AdminModule {}
