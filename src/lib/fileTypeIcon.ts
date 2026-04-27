import AEP from "../icons/files/AEP.svg";
import AI from "../icons/files/AI.svg";
import AVI from "../icons/files/AVI.svg";
import CSV from "../icons/files/CSV.svg";
import DOC from "../icons/files/DOC.svg";
import DOCX from "../icons/files/DOCX.svg";
import ETC from "../icons/files/ETC.svg";
import FIG from "../icons/files/FIG.svg";
import IMG from "../icons/files/IMG.svg";
import INDD from "../icons/files/INDD.svg";
import JPG from "../icons/files/JPG.svg";
import MKV from "../icons/files/MKV.svg";
import MP3 from "../icons/files/MP3.svg";
import MP4 from "../icons/files/MP4.svg";
import MPEG from "../icons/files/MPEG.svg";
import PDF from "../icons/files/PDF.svg";
import PNG from "../icons/files/PNG.svg";
import PPT from "../icons/files/PPT.svg";
import PPTX from "../icons/files/PPTX.svg";
import PSD from "../icons/files/PSD.svg";
import RAR from "../icons/files/RAR.svg";
import SVG from "../icons/files/SVG.svg";
import TXT from "../icons/files/TXT.svg";
import WAV from "../icons/files/WAV.svg";
import XLS from "../icons/files/XLS.svg";
import XLSX from "../icons/files/XLSX.svg";
import ZIP from "../icons/files/ZIP.svg";

const ICON_BY_EXTENSION: Record<string, string> = {
  aep: AEP,
  ai: AI,
  avi: AVI,
  csv: CSV,
  doc: DOC,
  docx: DOCX,
  fig: FIG,
  indd: INDD,
  jpg: JPG,
  jpeg: JPG,
  mkv: MKV,
  mp3: MP3,
  mp4: MP4,
  mpeg: MPEG,
  mpg: MPEG,
  pdf: PDF,
  png: PNG,
  ppt: PPT,
  pptx: PPTX,
  psd: PSD,
  rar: RAR,
  svg: SVG,
  txt: TXT,
  wav: WAV,
  xls: XLS,
  xlsx: XLSX,
  zip: ZIP,
};

const IMAGE_EXTENSION_FALLBACK = new Set(["gif", "webp", "bmp", "tif", "tiff", "heic", "heif"]);

function extensionFromFileName(fileName: string): string {
  const normalized = String(fileName ?? "").trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === normalized.length - 1) return "";
  return normalized.slice(dotIndex + 1);
}

export function fileTypeIconSrc(fileName: string): string {
  const ext = extensionFromFileName(fileName);
  if (!ext) return ETC;
  if (ICON_BY_EXTENSION[ext]) return ICON_BY_EXTENSION[ext];
  if (IMAGE_EXTENSION_FALLBACK.has(ext)) return IMG;
  return ETC;
}
