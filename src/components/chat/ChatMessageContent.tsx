import React from 'react';
import { Lightbulb, CheckCircle2 } from 'lucide-react';

interface ChatMessageContentProps {
  content: string;
  className?: string;
}

/**
 * Parses inline formatting:
 * **bold**, *italic*, `code`, [link](url)
 */
function renderInlineFormatting(text: string): React.ReactNode[] {
  // Regex splitting by bold (**...**), italic (*...*), and inline code (`...`)
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-navy-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={idx} className="italic text-navy-700">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-200/80 text-navy-800 text-[13px] font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Formats and renders AI responses into clean, human-readable sections,
 * handling headers, lists, blockquotes, tables, and paragraphs.
 */
export const ChatMessageContent: React.FC<ChatMessageContentProps> = ({
  content,
  className = '',
}) => {
  if (!content) return null;

  // Split lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Headings (###, ##, #)
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      const headingLevel = trimmed.startsWith('### ') ? 3 : trimmed.startsWith('## ') ? 2 : 1;
      const headingText = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <div key={`heading-${i}`} className={`pt-2.5 pb-1 ${elements.length === 0 ? 'pt-0' : ''}`}>
          <h4
            className={`font-heading font-bold text-navy-900 tracking-tight flex items-center gap-1.5 ${
              headingLevel <= 2 ? 'text-base sm:text-lg text-teal-900' : 'text-sm sm:text-[15px]'
            }`}
          >
            <span className="w-1.5 h-3.5 bg-teal-500 rounded-full inline-block flex-shrink-0" />
            {renderInlineFormatting(headingText)}
          </h4>
        </div>
      );
      i++;
      continue;
    }

    // 3. Horizontal rule (--- or ***)
    if (trimmed === '---' || trimmed === '***') {
      elements.push(
        <hr key={`hr-${i}`} className="my-2 border-slate-200/80" />
      );
      i++;
      continue;
    }

    // 4. Blockquote / Key Takeaway (> Quote)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      elements.push(
        <div
          key={`quote-${i}`}
          className="my-2.5 p-3 sm:p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80 shadow-sm"
        >
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <div className="text-[14px] text-teal-950 font-medium leading-relaxed">
              {quoteLines.map((ql, qIdx) => (
                <p key={qIdx} className={qIdx > 0 ? 'mt-1' : ''}>
                  {renderInlineFormatting(ql)}
                </p>
              ))}
            </div>
          </div>
        </div>
      );
      continue;
    }

    // 5. Tables (| Header | Header |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const rowLine = lines[i].trim();
        // check if separator row like |---|---|
        if (!rowLine.match(/^\|[\s-:]+\|$/)) {
          const cells = rowLine
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
          tableRows.push(cells);
        }
        i++;
      }

      if (tableRows.length > 0) {
        const headers = tableRows[0];
        const bodyRows = tableRows.slice(1);
        elements.push(
          <div key={`table-${i}`} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-left text-[13px] border-collapse bg-white">
              <thead className="bg-slate-100/90 text-navy-800 font-semibold border-b border-slate-200">
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-3.5 py-2 whitespace-nowrap">
                      {renderInlineFormatting(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-navy-700">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2">
                        {renderInlineFormatting(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 6. Unordered list (- item or * item)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().slice(2).trim());
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-1.5 space-y-1.5 pl-1">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="flex items-start gap-2 text-[14.5px] text-navy-800 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0 mt-2" />
              <div className="flex-1">{renderInlineFormatting(item)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 7. Ordered list (1. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: { num: string; text: string }[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const match = lines[i].trim().match(/^(\d+)\.\s+(.*)$/);
        if (match) {
          listItems.push({ num: match[1], text: match[2] });
        }
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-1.5 space-y-1.5 pl-1">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="flex items-start gap-2 text-[14.5px] text-navy-800 leading-relaxed">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                {item.num}
              </span>
              <div className="flex-1">{renderInlineFormatting(item.text)}</div>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 8. Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-[14.5px] text-navy-800 leading-relaxed my-1">
        {renderInlineFormatting(trimmed)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-1.5 font-sans ${className}`}>{elements}</div>;
};
