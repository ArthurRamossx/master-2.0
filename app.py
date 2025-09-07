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
        
        # Detalhes por jogador
        if bets:
            # Agrupar apostas por jogador
            players_data = {}
            for bet in bets:
                player_name = bet.get('playerName', 'Desconhecido')
                if player_name not in players_data:
                    players_data[player_name] = {
                        'total_apostado': 0,
                        'total_possivel': 0,
                        'apostas': [],
                        'ganhas': 0,
                        'perdidas': 0,
                        'pendentes': 0
                    }
                
                player_data = players_data[player_name]
                player_data['total_apostado'] += bet.get('betAmount', 0)
                player_data['total_possivel'] += bet.get('possibleWin', 0)
                player_data['apostas'].append(bet)
                
                if bet.get('status') == 'won':
                    player_data['ganhas'] += 1
                elif bet.get('status') == 'lost':
                    player_data['perdidas'] += 1
                else:
                    player_data['pendentes'] += 1
            
            # Criar seção para cada jogador
            for player_name, player_info in players_data.items():
                content.append(Spacer(1, 15))
                
                # Título do jogador
                player_title = Paragraph(f"👤 Jogador: {player_name}", styles['Heading2'])
                content.append(player_title)
                content.append(Spacer(1, 8))
                
                # Resumo do jogador
                player_summary_data = [
                    ['Resumo do Jogador', ''],
                    ['Total Apostado', f"€{player_info['total_apostado']:,.2f}".replace(',', '.')],
                    ['Total Possível Ganho', f"€{player_info['total_possivel']:,.2f}".replace(',', '.')],
                    ['Apostas Ganhas', str(player_info['ganhas'])],
                    ['Apostas Perdidas', str(player_info['perdidas'])],
                    ['Apostas Pendentes', str(player_info['pendentes'])],
                    ['Total de Apostas', str(len(player_info['apostas']))]
                ]
                
                player_summary_table = Table(player_summary_data, colWidths=[2.5*inch, 2*inch])
                player_summary_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.lightblue),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('FONTSIZE', (0, 1), (-1, -1), 9),
                ]))
                
                content.append(player_summary_table)
                content.append(Spacer(1, 10))
                
                # Detalhes das apostas do jogador
                apostas_title = Paragraph("📋 Detalhes das Apostas:", styles['Heading3'])
                content.append(apostas_title)
                content.append(Spacer(1, 5))
                
                apostas_data = [['Jogo', 'Aposta', 'Valor (€)', 'Odd', 'Possível Ganho (€)', 'Status', 'Resultado']]
                
                for bet in player_info['apostas']:
                    bet_type_text = ''
                    if bet.get('betType') == 'home':
                        bet_type_text = bet.get('gameDetails', {}).get('homeTeam', 'Casa')
                    elif bet.get('betType') == 'away':
                        bet_type_text = bet.get('gameDetails', {}).get('awayTeam', 'Fora')
                    else:
                        bet_type_text = 'Empate'
                    
                    status = bet.get('status', 'pending')
                    status_text = {
                        'pending': 'Pendente',
                        'won': 'GANHOU ✓',
                        'lost': 'PERDEU ✗'
                    }.get(status, 'Pendente')
                    
                    resultado_text = ''
                    if status == 'won':
                        resultado_text = f"€{bet.get('possibleWin', 0):,.2f}".replace(',', '.')
                    elif status == 'lost':
                        resultado_text = "€0,00"
                    else:
                        resultado_text = "Aguardando"
                    
                    apostas_data.append([
                        bet.get('gameName', ''),
                        bet_type_text,
                        f"€{bet.get('betAmount', 0):,.2f}".replace(',', '.'),
                        str(bet.get('odd', 0)),
                        f"€{bet.get('possibleWin', 0):,.2f}".replace(',', '.'),
                        status_text,
                        resultado_text
                    ])
                
                apostas_table = Table(apostas_data, colWidths=[1.2*inch, 1*inch, 0.8*inch, 0.6*inch, 1*inch, 0.8*inch, 0.8*inch])
                apostas_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('FONTSIZE', (0, 1), (-1, -1), 7),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                
                # Highlight ganhas/perdidas
                for i, bet in enumerate(player_info['apostas'], 1):
                    if bet.get('status') == 'won':
                        apostas_table.setStyle(TableStyle([
                            ('BACKGROUND', (5, i), (6, i), colors.lightgreen)
                        ]))
                    elif bet.get('status') == 'lost':
                        apostas_table.setStyle(TableStyle([
                            ('BACKGROUND', (5, i), (6, i), colors.lightcoral)
                        ]))
                
                content.append(apostas_table)
                content.append(Spacer(1, 15))
                
                # Linha divisória
                if player_name != list(players_data.keys())[-1]:  # Não adicionar linha após o último jogador
                    divider = Paragraph("─" * 80, styles['Normal'])
                    content.append(divider)
        
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
