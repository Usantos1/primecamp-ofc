import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';

interface TrainingCertificateProps {
  trainingTitle: string;
  userName: string;
  completedAt: string;
  onDownload?: () => void;
}

export function generateCertificate({
  trainingTitle,
  userName,
  completedAt
}: TrainingCertificateProps) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Background gradient effect (simulated with rectangles)
  doc.setFillColor(240, 248, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Border
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Decorative corner elements
  doc.setFillColor(59, 130, 246);
  const cornerSize = 15;
  doc.rect(10, 10, cornerSize, cornerSize, 'F');
  doc.rect(pageWidth - 10 - cornerSize, 10, cornerSize, cornerSize, 'F');
  doc.rect(10, pageHeight - 10 - cornerSize, cornerSize, cornerSize, 'F');
  doc.rect(pageWidth - 10 - cornerSize, pageHeight - 10 - cornerSize, cornerSize, cornerSize, 'F');

  // Title
  doc.setFontSize(32);
  doc.setTextColor(59, 130, 246);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICADO DE CONCLUSÃO', pageWidth / 2, 50, { align: 'center' });

  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Este certificado comprova que', pageWidth / 2, 65, { align: 'center' });

  // User name
  doc.setFontSize(28);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(userName, pageWidth / 2, 85, { align: 'center' });

  // Middle text
  doc.setFontSize(14);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('concluiu com sucesso o treinamento', pageWidth / 2, 100, { align: 'center' });

  // Training title
  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246);
  doc.setFont('helvetica', 'bold');
  const trainingTitleLines = doc.splitTextToSize(trainingTitle, pageWidth - 60);
  doc.text(trainingTitleLines, pageWidth / 2, 115, { align: 'center' });

  // Date
  const date = new Date(completedAt);
  const formattedDate = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`Concluído em ${formattedDate}`, pageWidth / 2, 140, { align: 'center' });

  // Certificate ID
  const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`ID: ${certificateId}`, pageWidth / 2, pageHeight - 30, { align: 'center' });

  // QR Code placeholder (you can add actual QR code generation here)
  doc.setFontSize(8);
  doc.text('Verifique a autenticidade deste certificado em primecamp.com.br', pageWidth / 2, pageHeight - 20, { align: 'center' });

  // Signature line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 40, pageHeight - 50, pageWidth / 2 + 40, pageHeight - 50);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Assinatura Digital', pageWidth / 2, pageHeight - 45, { align: 'center' });

  return { doc, certificateId };
}

interface CertificateDownloadButtonProps {
  trainingTitle: string;
  userName: string;
  completedAt: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function CertificateDownloadButton({
  trainingTitle,
  userName,
  completedAt,
  variant = 'outline',
  size = 'default'
}: CertificateDownloadButtonProps) {
  const handleDownload = () => {
    const { doc, certificateId } = generateCertificate({
      trainingTitle,
      userName,
      completedAt
    });

    const fileName = `Certificado_${trainingTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${certificateId}.pdf`;
    doc.save(fileName);
  };

  return (
    <Button
      onClick={handleDownload}
      variant={variant}
      size={size}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Baixar Certificado
    </Button>
  );
}

export function CertificateViewButton({
  trainingTitle,
  userName,
  completedAt
}: CertificateDownloadButtonProps) {
  const handleView = () => {
    const { doc } = generateCertificate({
      trainingTitle,
      userName,
      completedAt
    });

    // Open in new window
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  return (
    <Button
      onClick={handleView}
      variant="outline"
      className="gap-2"
    >
      <FileText className="h-4 w-4" />
      Ver Certificado
    </Button>
  );
}

