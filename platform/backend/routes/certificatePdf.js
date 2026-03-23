const express  = require('express');
const router   = express.Router();
const PDFDocument = require('pdfkit');
const { Certificate } = require('../models/index');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

/**
 * GET /api/certificates/:id/pdf
 * Streams a PDF of the certificate directly to the client.
 * Auth: the cert owner, any employer, or admin.
 */
router.get('/:id/pdf', protect, async (req, res) => {
  try {
    const cert = await Certificate.findByPk(req.params.id);
    if (!cert) return res.status(404).json({ message: 'Certificate not found.' });

    // Access control
    if (req.user.role === 'learner' && cert.learnerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const learner = await User.findByPk(cert.learnerId, { attributes: ['name', 'country'] });
    const issued  = new Date(cert.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${cert.verificationCode}`;

    // Set headers so browser downloads it as a named PDF
    const filename = `certificate-${cert.verificationCode}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // ── Build the PDF ──────────────────────────────────
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 60 });
    doc.pipe(res);

    const W = doc.page.width;
    const H = doc.page.height;

    // Background
    doc.rect(0, 0, W, H).fill('#ffffff');

    // Outer decorative border
    doc.rect(20, 20, W - 40, H - 40).lineWidth(3).stroke('#1e3a5f');
    doc.rect(26, 26, W - 52, H - 52).lineWidth(1).stroke('#1d4ed8');

    // Top colour band
    doc.rect(20, 20, W - 40, 8).fill('#1d4ed8');
    // Bottom colour band
    doc.rect(20, H - 28, W - 40, 8).fill('#065f46');

    // Organisation name
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#94a3b8')
      .text('AFRICAN LEADERSHIP UNIVERSITY — TALENT PLATFORM', 0, 55, { align: 'center', characterSpacing: 1.5 });

    // Title
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#94a3b8')
      .text('CERTIFICATE OF COMPLETION', 0, 80, { align: 'center', characterSpacing: 2 });

    // Decorative lines around title
    const titleY = 90;
    doc.moveTo(60, titleY).lineTo(W / 2 - 140, titleY).lineWidth(0.5).stroke('#e2e8f0');
    doc.moveTo(W / 2 + 140, titleY).lineTo(W - 60, titleY).lineWidth(0.5).stroke('#e2e8f0');

    // "This certifies that"
    doc.font('Helvetica').fontSize(13).fillColor('#64748b')
      .text('This certifies that', 0, 108, { align: 'center' });

    // Learner name
    doc.font('Helvetica-Bold').fontSize(36).fillColor('#1e3a5f')
      .text(learner?.name || 'Graduate', 0, 128, { align: 'center' });

    // "has successfully completed"
    doc.font('Helvetica').fontSize(13).fillColor('#64748b')
      .text('has successfully completed the course', 0, 178, { align: 'center' });

    // Skill area
    doc.font('Helvetica-BoldOblique').fontSize(22).fillColor('#1d4ed8')
      .text(cert.skillArea, 0, 200, { align: 'center' });

    // Body text
    doc.font('Helvetica').fontSize(11).fillColor('#64748b')
      .text(
        'demonstrating the required knowledge and skills as assessed on the ALU Talent Platform.',
        80, 234, { align: 'center', width: W - 160 }
      );

    // Stats row
    const statsY = 272;
    const col = W / 3;

    [
      { label: 'DATE ISSUED',      value: issued },
      { label: 'CERTIFICATE ID',   value: cert.verificationCode },
      { label: 'STATUS',           value: cert.isValid ? 'VALID ✓' : 'REVOKED' },
    ].forEach(({ label, value }, i) => {
      const x = col * i;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#94a3b8')
        .text(label, x, statsY, { width: col, align: 'center', characterSpacing: 1 });
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e3a5f')
        .text(value, x, statsY + 14, { width: col, align: 'center' });
    });

    // Signature lines
    const sigY = H - 120;
    const sigW = 180;

    // Left sig
    doc.moveTo(60, sigY).lineTo(60 + sigW, sigY).lineWidth(1).stroke('#334155');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e3a5f')
      .text('Premier Ufitinema', 60, sigY + 6, { width: sigW, align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor('#94a3b8')
      .text('Platform Director', 60, sigY + 18, { width: sigW, align: 'center' });

    // Seal (circle)
    const sealX = W / 2;
    const sealY = sigY - 10;
    doc.circle(sealX, sealY, 38).lineWidth(2).stroke('#1e3a5f');
    doc.circle(sealX, sealY, 32).lineWidth(0.5).stroke('#1e3a5f');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e3a5f')
      .text('ALU', sealX - 15, sealY - 10, { width: 30, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#1e3a5f')
      .text('TALENT', sealX - 18, sealY, { width: 36, align: 'center' });

    // Right sig
    const rightX = W - 60 - sigW;
    doc.moveTo(rightX, sigY).lineTo(rightX + sigW, sigY).lineWidth(1).stroke('#334155');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e3a5f')
      .text('African Leadership University', rightX, sigY + 6, { width: sigW, align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor('#94a3b8')
      .text('Issuing Institution', rightX, sigY + 18, { width: sigW, align: 'center' });

    // Verification URL at bottom
    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
      .text(`Verify at: ${verifyUrl}`, 0, H - 50, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Could not generate PDF.' });
    }
  }
});

module.exports = router;
