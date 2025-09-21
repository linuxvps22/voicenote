import {
    Document,
    Packer,
    Paragraph,
    TextRun,
  } from 'docx';
  import { saveAs } from 'file-saver';

  interface Word {
    text: string;
    speaker: string;
    startTime: number;
    endTime: number;
    punctuation: boolean;
    partial?: boolean;
  }
  
  export function exportToWord(words: readonly Word[]) {
    const paragraphs: Paragraph[] = [];
  
    let currentSpeaker = '';
    let currentWords: string[] = [];
  
    words.forEach((word, i) => {
      const isNewSpeaker = word.speaker !== currentSpeaker;
  
      if (isNewSpeaker && currentWords.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${currentSpeaker}:`, bold: true }),
              new TextRun(` ${currentWords.join(' ')}`),
            ],
          })
        );
        currentWords = [];
      }
  
      currentSpeaker = word.speaker || 'Unknown';
      currentWords.push(word.text);
  
      const isLastWord = i === words.length - 1;
      if (isLastWord && currentWords.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${currentSpeaker}:`, bold: true }),
              new TextRun(` ${currentWords.join(' ')}`),
            ],
          })
        );
      }
    });
  
    const doc = new Document({
      creator: 'Transcript Exporter',
      title: 'Transcript',
      description: 'Exported transcript with speaker labels',
      sections: [
        {
          children: paragraphs,
        },
      ],
    });
  
    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, 'transcript.docx');
    });
  }
  