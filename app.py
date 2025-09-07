from flask import Flask, render_template, send_from_directory, jsonify, request, send_file
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from docx import Document
from docx.shared import Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
import os
import json
from datetime import datetime
import io

app = Flask(__name__)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/style.css')
def style():
    return send_from_directory('.', 'style.css')

@app.route('/script.js')
def script():
    return send_from_directory('.', 'script.js')

@app.route('/generate-pdf-report', methods=['POST'])
def generate_pdf_report():
    try:
        data = request.get_json()
        bets = data.get('bets', [])
        games = data.get('games', [])
        
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        # Build content
        content = []
        
        # Title
        title = Paragraph("🏆 MASTER LEAGUE - Relatório de Apostas", title_style)
        content.append(title)
        content.append(Spacer(1, 12))
        
        # Date
        date_text = f"Data: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        date_para = Paragraph(date_text, styles['Normal'])
        content.append(date_para)
        content.append(Spacer(1, 12))
        
        # Summary
        total_bets = len(bets)
        total_amount = sum(bet.get('betAmount', 0) for bet in bets)
        pending_bets = len([bet for bet in bets if bet.get('status') == 'pending'])
        won_bets = len([bet for bet in bets if bet.get('status') == 'won'])
        lost_bets = len([bet for bet in bets if bet.get('status') == 'lost'])
        
        summary_data = [
            ['Resumo Geral', ''],
            ['Total de Apostas', str(total_bets)],
            ['Valor Total Apostado', f"€{total_amount:,.2f}".replace(',', '.')],
            ['Apostas Pendentes', str(pending_bets)],
            ['Apostas Ganhas', str(won_bets)],
            ['Apostas Perdidas', str(lost_bets)]
        ]
        
        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        content.append(summary_table)
        content.append(Spacer(1, 20))
        
        # Bets table
        if bets:
            bets_title = Paragraph("Detalhes das Apostas", styles['Heading2'])
            content.append(bets_title)
            content.append(Spacer(1, 12))
            
            # Table headers
            table_data = [['Jogador', 'Jogo', 'Aposta', 'Valor (€)', 'Odd', 'Status']]
            
            for bet in bets:
                bet_type_text = ''
                if bet.get('betType') == 'home':
                    bet_type_text = bet.get('gameDetails', {}).get('homeTeam', 'Casa')
                elif bet.get('betType') == 'away':
                    bet_type_text = bet.get('gameDetails', {}).get('awayTeam', 'Fora')
                else:
                    bet_type_text = 'Empate'
                
                status_text = {
                    'pending': 'Pendente',
                    'won': 'Ganhou',
                    'lost': 'Perdeu'
                }.get(bet.get('status', 'pending'), 'Pendente')
                
                table_data.append([
                    bet.get('playerName', ''),
                    bet.get('gameName', ''),
                    bet_type_text,
                    f"€{bet.get('betAmount', 0):,.2f}".replace(',', '.'),
                    str(bet.get('odd', 0)),
                    status_text
                ])
            
            table = Table(table_data, colWidths=[1.5*inch, 1.5*inch, 1*inch, 1*inch, 0.8*inch, 1*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
            ]))
            
            content.append(table)
        
        # Build PDF
        doc.build(content)
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f'relatorio_apostas_{datetime.now().strftime("%Y%m%d_%H%M")}.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate-word-report', methods=['POST'])
def generate_word_report():
    try:
        data = request.get_json()
        bets = data.get('bets', [])
        games = data.get('games', [])
        
        # Create Word document
        doc = Document()
        
        # Title
        title = doc.add_heading('🏆 MASTER LEAGUE - Relatório de Apostas', 0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Date
        date_para = doc.add_paragraph(f'Data: {datetime.now().strftime("%d/%m/%Y %H:%M")}')
        date_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        
        doc.add_paragraph('')  # Space
        
        # Summary
        doc.add_heading('Resumo Geral', level=1)
        
        total_bets = len(bets)
        total_amount = sum(bet.get('betAmount', 0) for bet in bets)
        pending_bets = len([bet for bet in bets if bet.get('status') == 'pending'])
        won_bets = len([bet for bet in bets if bet.get('status') == 'won'])
        lost_bets = len([bet for bet in bets if bet.get('status') == 'lost'])
        
        summary_table = doc.add_table(rows=6, cols=2)
        summary_table.style = 'Table Grid'
        
        summary_data = [
            ['Total de Apostas', str(total_bets)],
            ['Valor Total Apostado', f"€{total_amount:,.2f}".replace(',', '.')],
            ['Apostas Pendentes', str(pending_bets)],
            ['Apostas Ganhas', str(won_bets)],
            ['Apostas Perdidas', str(lost_bets)]
        ]
        
        for i, (label, value) in enumerate(summary_data):
            summary_table.cell(i, 0).text = label
            summary_table.cell(i, 1).text = value
        
        doc.add_paragraph('')  # Space
        
        # Bets details
        if bets:
            doc.add_heading('Detalhes das Apostas', level=1)
            
            table = doc.add_table(rows=1, cols=6)
            table.style = 'Table Grid'
            
            # Headers
            headers = ['Jogador', 'Jogo', 'Aposta', 'Valor (€)', 'Odd', 'Status']
            for i, header in enumerate(headers):
                table.cell(0, i).text = header
                table.cell(0, i).paragraphs[0].runs[0].bold = True
            
            # Data rows
            for bet in bets:
                row = table.add_row()
                
                bet_type_text = ''
                if bet.get('betType') == 'home':
                    bet_type_text = bet.get('gameDetails', {}).get('homeTeam', 'Casa')
                elif bet.get('betType') == 'away':
                    bet_type_text = bet.get('gameDetails', {}).get('awayTeam', 'Fora')
                else:
                    bet_type_text = 'Empate'
                
                status_text = {
                    'pending': 'Pendente',
                    'won': 'Ganhou',
                    'lost': 'Perdeu'
                }.get(bet.get('status', 'pending'), 'Pendente')
                
                row.cells[0].text = bet.get('playerName', '')
                row.cells[1].text = bet.get('gameName', '')
                row.cells[2].text = bet_type_text
                row.cells[3].text = f"€{bet.get('betAmount', 0):,.2f}".replace(',', '.')
                row.cells[4].text = str(bet.get('odd', 0))
                row.cells[5].text = status_text
        
        # Save to buffer
        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f'relatorio_apostas_{datetime.now().strftime("%Y%m%d_%H%M")}.docx',
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
