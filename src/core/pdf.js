import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export async function generarPDFCuadre(datos, nombreTienda = 'Tienda Pro') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fecha = new Date().toLocaleDateString('es-DO');

  // Header
  doc.setFillColor(33, 150, 243);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('CUADRE DIARIO', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`${nombreTienda} · ${fecha}`, 105, 30, { align: 'center' });

  const body = [
    ['Ventas del dia', datos.ventasTotal],
    ['Costo de lo vendido', datos.costoVendido],
    ['Ganancia bruta', datos.gananciaBruta],
    ['Gastos operativos', datos.gastosOp],
    ['Ganancia neta', datos.gananciaNeta],
    ['Inventario fisico (uds)', datos.inventarioFisico],
    ['Valor del inventario', datos.valorInventario],
  ];

  doc.autoTable({
    startY: 50,
    head: [['Concepto', 'Monto']],
    body: body.map(r => [r[0], `$${r[1].toFixed(2)}`]),
    theme: 'grid',
    headStyles: { fillColor: [33, 150, 243], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 255] },
    styles: { fontSize: 11, cellPadding: 3 }
  });

  if (datos.socios?.length) {
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Socio', '%', 'Monto']],
      body: datos.socios.map(s => [s.nombre, `${s.porcentaje}%`, `$${s.monto.toFixed(2)}`]),
      theme: 'grid',
      headStyles: { fillColor: [124, 58, 237] }
    });
  }

  if (datos.chartImage) {
    doc.addImage(datos.chartImage, 'PNG', 15, doc.lastAutoTable.finalY + 10, 180, 80);
  }

  doc.save(`cuadre_${fecha.replace(/\//g, '-')}.pdf`);
}
