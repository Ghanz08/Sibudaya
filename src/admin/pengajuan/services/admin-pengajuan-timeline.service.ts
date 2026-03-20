import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { STATUS } from '../../../common/constants/status.constants';
import { UpdateTimelineStatusDto } from '../dto/admin-pengajuan.dto';
import { AdminPengajuanQueryService } from './admin-pengajuan-query.service';
import { AdminPengajuanNotifierService } from './admin-pengajuan-notifier.service';

@Injectable()
export class AdminPengajuanTimelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryService: AdminPengajuanQueryService,
    private readonly notifierService: AdminPengajuanNotifierService,
  ) {}

  async updateTimelineStatus(
    pengajuanId: string,
    dto: UpdateTimelineStatusDto,
  ) {
    const pengajuan = await this.queryService.findDetailOrThrow(pengajuanId);
    const isPentas = pengajuan.jenis_fasilitasi_id === 1;
    const now = new Date();

    const targetStatus =
      dto.status === 'COMPLETED'
        ? STATUS.SELESAI
        : dto.status === 'REJECTED'
          ? STATUS.DITOLAK
          : STATUS.DALAM_PROSES;
    const rejectionNote = dto.note?.trim();

    if (targetStatus === STATUS.DITOLAK && !rejectionNote) {
      throw new BadRequestException('Alasan penolakan wajib diisi');
    }

    await this.prisma.$transaction(async (tx) => {
      switch (dto.step) {
        case 'PEMERIKSAAN': {
          await tx.pengajuan.update({
            where: { pengajuan_id: pengajuanId },
            data: {
              status_pemeriksaan:
                targetStatus === STATUS.SELESAI
                  ? STATUS.DISETUJUI
                  : targetStatus,
              status:
                targetStatus === STATUS.DITOLAK
                  ? STATUS.DITOLAK
                  : STATUS.DALAM_PROSES,
              ...(targetStatus === STATUS.DITOLAK
                ? { catatan_pemeriksaan: rejectionNote }
                : {}),
              ...(targetStatus !== STATUS.DITOLAK
                ? { catatan_pemeriksaan: null }
                : {}),
            },
          });

          await tx.survey_lapangan.deleteMany({
            where: { pengajuan_id: pengajuanId },
          });
          await tx.surat_persetujuan.deleteMany({
            where: { pengajuan_id: pengajuanId },
          });
          await tx.pengiriman_sarana.deleteMany({
            where: { pengajuan_id: pengajuanId },
          });
          await tx.laporan_kegiatan.deleteMany({
            where: { pengajuan_id: pengajuanId },
          });
          await tx.pencairan_dana.deleteMany({
            where: { pengajuan_id: pengajuanId },
          });
          break;
        }

        case 'SURVEY': {
          if (isPentas) {
            throw new BadRequestException(
              'Step survey hanya tersedia untuk Fasilitasi Hibah',
            );
          }

          await tx.pengajuan.update({
            where: { pengajuan_id: pengajuanId },
            data: { status_pemeriksaan: STATUS.DISETUJUI },
          });

          await tx.survey_lapangan.upsert({
            where: { pengajuan_id: pengajuanId },
            create: {
              pengajuan_id: pengajuanId,
              tanggal_survey: now,
              status: targetStatus,
              catatan:
                targetStatus === STATUS.DITOLAK ? rejectionNote : dto.note,
            },
            update: {
              status: targetStatus,
              ...(targetStatus === STATUS.DITOLAK
                ? { catatan: rejectionNote }
                : dto.note
                  ? { catatan: dto.note }
                  : {}),
            },
          });

          await tx.pengajuan.update({
            where: { pengajuan_id: pengajuanId },
            data: {
              status: STATUS.DALAM_PROSES,
            },
          });

          await tx.surat_persetujuan.deleteMany({
            where: { pengajuan_id: pengajuanId },
          });
          await tx.pengiriman_sarana.deleteMany({
            where: { pengajuan_id: pengajuanId },
          });
          await tx.laporan_kegiatan.deleteMany({
            where: { pengajuan_id: pengajuanId },
          });
          break;
        }

        case 'SURAT_PERSETUJUAN': {
          if (targetStatus === STATUS.DITOLAK) {
            throw new BadRequestException(
              'Penolakan step surat persetujuan belum didukung karena tidak ada kolom alasan penolakan',
            );
          }

          const surat = await tx.surat_persetujuan.findUnique({
            where: { pengajuan_id: pengajuanId },
          });

          if (!surat) {
            throw new BadRequestException(
              'Surat persetujuan belum diunggah. Unggah surat terlebih dahulu.',
            );
          }

          await tx.surat_persetujuan.update({
            where: { pengajuan_id: pengajuanId },
            data: {
              status: targetStatus,
              tanggal_konfirmasi: targetStatus === STATUS.SELESAI ? now : null,
            },
          });

          await tx.pengajuan.update({
            where: { pengajuan_id: pengajuanId },
            data: {
              status: STATUS.DALAM_PROSES,
            },
          });

          await tx.pengiriman_sarana.deleteMany({
            where: { pengajuan_id: pengajuanId },
          });
          await tx.laporan_kegiatan.deleteMany({
            where: { pengajuan_id: pengajuanId },
          });
          await tx.pencairan_dana.deleteMany({
            where: { pengajuan_id: pengajuanId },
          });
          break;
        }

        case 'PENGIRIMAN': {
          if (isPentas) {
            throw new BadRequestException(
              'Step pengiriman hanya tersedia untuk Fasilitasi Hibah',
            );
          }

          await tx.pengiriman_sarana.upsert({
            where: { pengajuan_id: pengajuanId },
            create: {
              pengajuan_id: pengajuanId,
              status: targetStatus,
              catatan:
                targetStatus === STATUS.DITOLAK ? rejectionNote : undefined,
            },
            update: {
              status: targetStatus,
              ...(targetStatus === STATUS.DITOLAK
                ? { catatan: rejectionNote }
                : {}),
            },
          });

          await tx.pengajuan.update({
            where: { pengajuan_id: pengajuanId },
            data: {
              status:
                targetStatus === STATUS.DITOLAK
                  ? STATUS.DITOLAK
                  : STATUS.DALAM_PROSES,
            },
          });

          await tx.laporan_kegiatan.deleteMany({
            where: { pengajuan_id: pengajuanId },
          });
          break;
        }

        case 'PELAPORAN': {
          await tx.laporan_kegiatan.upsert({
            where: { pengajuan_id: pengajuanId },
            create: {
              pengajuan_id: pengajuanId,
              status: targetStatus,
              catatan_admin:
                targetStatus === STATUS.DITOLAK ? rejectionNote : dto.note,
            },
            update: {
              status: targetStatus,
              ...(targetStatus === STATUS.DITOLAK
                ? { catatan_admin: rejectionNote }
                : dto.note
                  ? { catatan_admin: dto.note }
                  : {}),
            },
          });

          if (isPentas) {
            await tx.pencairan_dana.deleteMany({
              where: { pengajuan_id: pengajuanId },
            });
          }

          await tx.pengajuan.update({
            where: { pengajuan_id: pengajuanId },
            data: {
              status:
                !isPentas && targetStatus === STATUS.SELESAI
                  ? STATUS.SELESAI
                  : STATUS.DALAM_PROSES,
            },
          });
          break;
        }

        case 'PENCAIRAN': {
          if (!isPentas) {
            throw new BadRequestException(
              'Step pencairan hanya tersedia untuk Fasilitasi Pentas',
            );
          }

          if (targetStatus === STATUS.DITOLAK) {
            throw new BadRequestException(
              'Penolakan step pencairan belum didukung karena tidak ada kolom alasan penolakan',
            );
          }

          await tx.pencairan_dana.upsert({
            where: { pengajuan_id: pengajuanId },
            create: {
              pengajuan_id: pengajuanId,
              status: targetStatus,
            },
            update: { status: targetStatus },
          });

          await tx.pengajuan.update({
            where: { pengajuan_id: pengajuanId },
            data: {
              status:
                targetStatus === STATUS.SELESAI
                  ? STATUS.SELESAI
                  : STATUS.DALAM_PROSES,
            },
          });
          break;
        }

        default:
          throw new BadRequestException('Step timeline tidak dikenali');
      }
    });

    const timelineTitleMap: Record<UpdateTimelineStatusDto['step'], string> = {
      PEMERIKSAAN: 'Pemeriksaan Pengajuan',
      SURVEY: 'Survey Lapangan',
      SURAT_PERSETUJUAN: 'Surat Persetujuan',
      PENGIRIMAN: 'Pengiriman Sarana',
      PELAPORAN: 'Laporan Kegiatan',
      PENCAIRAN: 'Pencairan Dana',
    };

    const stepLabel = timelineTitleMap[dto.step] ?? dto.step;
    const statusLabelMap: Record<UpdateTimelineStatusDto['status'], string> = {
      IN_PROGRESS: 'DALAM PROSES',
      COMPLETED: 'SELESAI',
      REJECTED: 'DITOLAK',
    };
    const statusLabel = statusLabelMap[dto.status] ?? dto.status;

    const userId = pengajuan.lembaga_budaya.user_id;
    await this.notifierService.kirimNotifikasiUserDanSuperAdmin(
      userId,
      `${stepLabel} Diperbarui`,
      `${stepLabel} diperbarui menjadi ${statusLabel}.${dto.note ? ` Catatan: ${dto.note}` : ''}`,
    );

    return this.queryService.findDetailOrThrow(pengajuanId);
  }
}
