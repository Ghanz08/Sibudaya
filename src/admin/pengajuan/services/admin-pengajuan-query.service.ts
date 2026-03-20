import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FilterPengajuanDto } from '../dto/admin-pengajuan.dto';

@Injectable()
export class AdminPengajuanQueryService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: FilterPengajuanDto) {
    return this.prisma.pengajuan.findMany({
      where: {
        ...(filter.status && { status: filter.status }),
        ...(filter.jenis_fasilitasi_id && {
          jenis_fasilitasi_id: Number(filter.jenis_fasilitasi_id),
        }),
      },
      include: {
        lembaga_budaya: { include: { sertifikat_nik: true } },
        jenis_fasilitasi: true,
        paket_fasilitasi: true,
      },
      orderBy: { tanggal_pengajuan: 'desc' },
    });
  }

  async findDetail(pengajuanId: string) {
    const data = await this.findDetailOrThrow(pengajuanId);
    return data;
  }

  async findDetailOrThrow(pengajuanId: string) {
    const data = await this.prisma.pengajuan.findUnique({
      where: { pengajuan_id: pengajuanId },
      include: {
        lembaga_budaya: { include: { users: true, sertifikat_nik: true } },
        jenis_fasilitasi: true,
        paket_fasilitasi: true,
        surat_persetujuan: true,
        survey_lapangan: true,
        laporan_kegiatan: true,
        pencairan_dana: true,
        pengiriman_sarana: true,
      },
    });

    if (!data) throw new NotFoundException('Pengajuan tidak ditemukan');
    return data;
  }
}
