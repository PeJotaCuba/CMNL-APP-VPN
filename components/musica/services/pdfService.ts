import { jsPDF } from "jspdf";
import * as pdfjsLib from 'pdfjs-dist';

const pdfjs = pdfjsLib;

if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
} else {
    console.warn("PDF.js GlobalWorkerOptions no encontrado, la lectura de PDF podría fallar.");
}

interface ReportData {
    userFullName: string;
    userUniqueId: string;
    program: string;
    date: string;
    items: {
        title: string;
        author: string;
        authorCountry: string;
        performer: string;
        performerCountry: string;
        genre: string;
    }[];
}

export const generateReportPDF = (data: ReportData): Blob => {
    const JsPDFCtor = (jsPDF as any).default || jsPDF;
    const doc = new JsPDFCtor();
    
    // Format date for display inside PDF
    let displayDate = data.date;
    try {
        // If it's YYYY-MM-DD, we want to show it as is or formatted nicely
        if (data.date.includes('-')) {
            const [y, m, d] = data.date.split('T')[0].split('-');
            displayDate = `${d}/${m}/${y}`;
        }
    } catch (e) {
        displayDate = data.date;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("REPORTE OFICIAL DE CRÉDITOS MUSICALES", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text("CMNL RADIO CIUDAD MONUMENTO", 105, 28, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Director(a): ${data.userFullName}`, 20, 45);
    doc.text(`Fecha: ${displayDate}`, 20, 50);
    doc.text(`Programa: ${data.program || 'Sin Especificar'}`, 20, 55);

    doc.setLineWidth(0.5);
    doc.line(20, 60, 190, 60);

    let y = 70;
    const pageHeight = doc.internal.pageSize.height;

    data.items.forEach((item, index) => {
        if (y > pageHeight - 30) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`[${index + 1}] ${item.title}`, 20, y);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        y += 5;
        
        const details = [
            `Autor: ${item.author || '---'} (${item.authorCountry || '-'})`,
            `Intérprete: ${item.performer || '---'} (${item.performerCountry || '-'})`,
            `Género: ${item.genre || '---'}`
        ];

        details.forEach(line => {
             doc.text(line, 25, y);
             y += 5;
        });
        
        y += 3;
    });

    if (y > pageHeight - 40) {
        doc.addPage();
        y = 40;
    } else {
        y += 20;
    }
    
    doc.setLineWidth(0.5);
    doc.line(60, y, 150, y);
    doc.setFontSize(10);
    doc.text("FIRMA DIGITAL", 105, y + 5, { align: "center" });
    doc.setFont("courier", "normal");
    doc.text(data.userUniqueId, 105, y + 10, { align: "center" });

    return doc.output('blob');
};

export const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            const pageText = textContent.items.map((item: any) => item.str).join('\n');
            
            fullText += pageText + '\n';
        }

        return fullText;
    } catch (e) {
        console.error("Error leyendo PDF:", e);
        throw new Error("No se pudo leer el archivo PDF.");
    }
};
