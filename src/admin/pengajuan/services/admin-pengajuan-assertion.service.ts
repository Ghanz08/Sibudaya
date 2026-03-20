import { BadRequestException, Injectable } from '@nestjs/common';
import { STATUS } from '../../../common/constants/status.constants';
import { AdminPengajuanQueryService } from './admin-pengajuan-query.service';

@Injectable()
export class AdminPengajuanAssertionService {
  assertPemeriksaanDisetujui(
    pengajuan: Awaited<
      ReturnType<AdminPengajuanQueryService['findDetailOrThrow']>
    >,
  ) {
    if (pengajuan.status_pemeriksaan !== STATUS.DISETUJUI) {
      throw new BadRequestException(
        'Pemeriksaan data belum disetujui. Tahap ini belum bisa dilanjutkan.',
      );
    }
  }

  assertJenisPentas(
    pengajuan: Awaited<
      ReturnType<AdminPengajuanQueryService['findDetailOrThrow']>
    >,
  ) {
    if (pengajuan.jenis_fasilitasi_id !== 1) {
      throw new BadRequestException(
        'Aksi ini hanya berlaku untuk Fasilitasi Pentas',
      );
    }
  }

  assertJenisHibah(
    pengajuan: Awaited<
      ReturnType<AdminPengajuanQueryService['findDetailOrThrow']>
    >,
  ) {
    if (pengajuan.jenis_fasilitasi_id !== 2) {
      throw new BadRequestException(
        'Aksi ini hanya berlaku untuk Fasilitasi Hibah',
      );
    }
  }
}
