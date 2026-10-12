import { useRef, useState } from "react";
import { Copy, Check, Download, Table, BarChart3 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";
import EChart from "../charts/EChart";

function isChartConfig(codeStr) {
    if (!codeStr) return false;
    try {
        const obj = JSON.parse(codeStr.trim());
        return Boolean(
            obj &&
            typeof obj === 'object' &&
            (obj.series || obj.xAxis || obj.yAxis || obj.title || obj.tooltip)
        );
    } catch {
        return false;
    }
}

function fixMalformedBlocks(content) {
    if (!content) return "";

    let md = content;

    // Fix inline fenced blocks: ```lang code```
    md = md.replace(/```([^\s`]+)\s+([^`]+?)```/g, (m, lang, code) => {
        return `\`\`\`${lang}\n${code.trim()}\n\`\`\``;
    });

    // Fix single-line start fences: ```lang code
    md = md.replace(/```([^\n`]+)\n?/g, (m, head) => {
        const lang = head.trim().split(/\s+/)[0]; // Take only first token
        return `\n\`\`\`${lang}\n`;
    });

    // Normalize math delimiters for remark-math (converts \[ \] to $$ and \( \) to $)
    // We do this because remark-math is most stable with dollar sign delimiters.
    md = md.replace(/\\\[([\s\S]+?)\\\]/g, (m, math) => `\n$$\n${math.trim()}\n$$\n`);
    md = md.replace(/\\\(([\s\S]+?)\\\)/g, (m, math) => `$${math.trim()}$`);

    // Catch "lazy" math blocks [ ... ] if they contain common LaTeX tokens like \frac, \times, \approx
    md = md.replace(/^\[\s*([\s\S]+?\\(?:frac|times|approx|mathbf|sum|int|sqrt|text|mathrm)[\s\S]+?)\s*\]$/gm, (m, math) => `\n$$\n${math.trim()}\n$$\n`);

    const sanitizeMath = (math) => {
        let s = math;
        // 1. Convert markdown bold **...** to \mathbf{...}
        s = s.replace(/\*\*(.+?)\*\*/g, "\\mathbf{$1}");

        // 2. Fix spaces in \mathbf{...} or \mathrm{...}
        // KaTeX's \mathbf ignores spaces. We wrap in \text to preserve them.
        s = s.replace(/\\(mathbf|mathrm)\{([^{}]+)\}/g, (m, cmd, content) => {
            if (content.includes(" ") && !content.includes("\\text")) {
                return `\\${cmd}{\\text{${content}}}`;
            }
            return m;
        });

        // 3. Escape unescaped % signs
        s = s.replace(/([^\\0-9])%/g, "$1\\%").replace(/^%/g, "\\%");

        return s;
    };

    // Define standalone patterns that models often forget to wrap in $
    const complexCmds = 'mathbf|text|mathrm|frac|sqrt|sum|int';
    const simpleCmds = 'approx|times|Delta|sigma|mu|alpha|beta|gamma|theta|pi|pm|div|neq|le|ge|infty|dots';
    const standaloneRegex = new RegExp(`\\\\(?:(?:${complexCmds})(?:\\{[^{}]*\\})+|(?:${simpleCmds}))(?![a-zA-Z])`, 'g');

    // Split by existing math blocks ($$ or $) to avoid double-processing
    // Using capturing group in split includes the delimiters in the results array
    const pieces = md.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);

    for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i];
        if (!piece) continue;

        if (piece.startsWith('$')) {
            // This is an existing math block
            if (piece.startsWith('$$')) {
                const inner = piece.slice(2, -2);
                pieces[i] = `\n$$\n${sanitizeMath(inner)}\n$$\n`;
            } else {
                const inner = piece.slice(1, -1);
                pieces[i] = `$${sanitizeMath(inner)}$`;
            }
        } else {
            // This is plain text - wrap missing delimiters
            pieces[i] = piece.replace(standaloneRegex, (m) => `$${m}$`);
        }
    }

    return pieces.join("");
}

function MarkdownCode({ className, children }) {
    const match = /language-(\w+)/.exec(className || "");
    const language = match?.[1]?.toLowerCase();
    const preRef = useRef(null);
    const [localCopied, setLocalCopied] = useState(false);

    const rawCode = typeof children === 'string'
        ? children
        : Array.isArray(children)
            ? children.map(c => (typeof c === 'string' ? c : c?.props?.children || '')).join('')
            : String(children || '');

    if (language === 'echarts' || language === 'chart' || (language === 'json' && isChartConfig(rawCode))) {
        try {
            const chartOption = JSON.parse(rawCode.trim());
            return (
                <div className="my-4 p-3.5 bg-slate-900 rounded-xl border border-slate-700 shadow-md">
                    <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                        <span>Interactive AI Chart</span>
                    </div>
                    <div className="h-64 w-full">
                        <EChart option={chartOption} />
                    </div>
                </div>
            );
        } catch {
            // fallback to code block
        }
    }

    if (!language) {
        return (
            <span className="bg-slate-200 text-slate-900 px-1.5 py-0.5 rounded text-xs font-mono">
                {children}
            </span>
        );
    }

    return (
        <div className="group relative bg-slate-950 text-slate-100 text-sm rounded-md mt-3 mb-4 max-w-5xl border border-slate-800">
            <span className="absolute top-2 left-3 text-[10px] tracking-wider text-slate-400 font-mono font-medium select-none">
                {language}
            </span>

            <button
                onClick={async () => {
                    const text = preRef.current?.innerText || "";
                    await navigator.clipboard.writeText(text);
                    setLocalCopied(true);
                    setTimeout(() => setLocalCopied(false), 1200);
                }}
                className="absolute top-2 right-2 z-30 flex items-center gap-1 text-xs text-slate-300 hover:text-white cursor-pointer px-2 py-1 rounded transition"
            >
                {localCopied ? (
                    <>
                        <Check size={12} className="inline-block" />
                        <span className="leading-none">Copied</span>
                    </>
                ) : (
                    <>
                        <Copy size={12} className="inline-block" />
                        <span className="leading-none">Copy</span>
                    </>
                )}
            </button>

            <div className="overflow-x-auto">
                <pre ref={preRef} className="p-4 pt-10 font-mono text-xs whitespace-pre">
                    {children}
                </pre>
            </div>
        </div>
    );
}

function markdownToExcel(md) {
    return md
        .trim()
        .split("\n")
        .filter((line) => line.startsWith("|"))
        .map((row) =>
            row
                .slice(1, -1)
                .split("|")
                .map((col) => col.trim())
        )
        .filter(
            (cols) =>
                !cols.every((col) => /^:?-+:?$/.test(col))
        )
        .map((cols) => cols.join("\t"))
        .join("\n");
}

function formatMarkdownTable(md) {
    if (!md) return "";
    const lines = md.trim().split("\n");

    // Parse rows and columns
    const parsedRows = lines.map(line => {
        let trimmed = line.trim();
        if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
        if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
        return trimmed.split("|").map(cell => cell.trim());
    });

    if (parsedRows.length < 2) return md; // Not a valid table

    const header = parsedRows[0];
    const separatorRow = parsedRows[1];
    const dataRows = parsedRows.slice(2);

    // If separator row doesn't match column count of header, or doesn't look like a separator, return original
    if (separatorRow.length !== header.length || !separatorRow.every(col => /^:?-+:?$/.test(col.trim()))) {
        return md;
    }

    const alignments = separatorRow.map(col => {
        const trimmed = col.trim();
        const left = trimmed.startsWith(":");
        const right = trimmed.endsWith(":");
        if (left && right) return "center-colon";
        if (right) return "right-colon";
        if (left) return "left-colon";
        return "none";
    });

    const numCols = header.length;
    const colWidths = Array(numCols).fill(0);

    for (let colIdx = 0; colIdx < numCols; colIdx++) {
        let maxW = (header[colIdx] || "").length;
        for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
            const cellVal = (dataRows[rowIdx] && dataRows[rowIdx][colIdx]) || "";
            if (cellVal.length > maxW) {
                maxW = cellVal.length;
            }
        }
        colWidths[colIdx] = Math.max(maxW, 3);
    }

    const formatCell = (text, width, alignment) => {
        const padding = width - text.length;
        if (padding <= 0) return text;
        if (alignment === "right-colon") {
            return " ".repeat(padding) + text;
        } else if (alignment === "center-colon") {
            const leftPad = Math.floor(padding / 2);
            const rightPad = padding - leftPad;
            return " ".repeat(leftPad) + text + " ".repeat(rightPad);
        } else {
            return text + " ".repeat(padding);
        }
    };

    const formattedHeader = "| " + header.map((cell, idx) => formatCell(cell || "", colWidths[idx], alignments[idx] || "none")).join(" | ") + " |";

    const formattedSeparator = "| " + alignments.map((align, idx) => {
        const width = colWidths[idx];
        return "-".repeat(width);
    }).join(" | ") + " |";

    const formattedData = dataRows.map(row => {
        return "| " + Array.from({ length: numCols }).map((_, idx) => {
            const cellText = row[idx] || "";
            const align = alignments[idx] || "none";
            const width = colWidths[idx] || 3;
            return formatCell(cellText, width, align);
        }).join(" | ") + " |";
    });

    return [formattedHeader, formattedSeparator, ...formattedData].join("\n");
}

function IconButton({ icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className="
                group relative p-1.5 rounded 
                text-gray-600 hover:text-gray-900 
                hover:bg-gray-200 transition
                cursor-pointer
            "
        >
            {icon}

            <span
                className="
                    pointer-events-none absolute left-1/2 -translate-x-1/2 
                    -bottom-7 text-[10px] py-1 px-2 rounded 
                    bg-black text-white whitespace-nowrap 
                    opacity-0 group-hover:opacity-100 
                    transition
                "
            >
                {label}
            </span>
        </button>
    );
}

export default function MarkdownRenderer({ content }) {
    const cleaned = fixMalformedBlocks(content);

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeHighlight, rehypeKatex, rehypeRaw]}
            components={{
                table: ({ node, children, ...props }) => {
                    const start = node.position.start.offset;
                    const end = node.position.end.offset;
                    const markdownTable = content.slice(start, end);
                    const formattedMarkdownTable = formatMarkdownTable(markdownTable);
                    const excel = markdownToExcel(markdownTable);

                    const [copiedMd, setCopiedMd] = useState(false);
                    const [copiedExcel, setCopiedExcel] = useState(false);
                    const [downloading, setDownloading] = useState(false);

                    async function copy(text, setter) {
                        await navigator.clipboard.writeText(text);
                        setter(true);
                        setTimeout(() => setter(false), 1200);
                    }

                    async function downloadCSV() {
                        setDownloading(true);

                        const csv = excel
                            .split("\n")
                            .map(row =>
                                row
                                    .split("\t")
                                    .map(cell => `"${cell.replace(/"/g, '""')}"`)
                                    .join(",")
                            )
                            .join("\n");

                        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "table.csv";
                        a.click();
                        URL.revokeObjectURL(url);

                        setTimeout(() => setDownloading(false), 1200);
                    }

                    return (
                        <div className="relative max-w-5xl my-6">
                            <div className="inline-block relative min-w-full md:min-w-1/2 max-w-full">
                                <div className="relative">
                                    <div className="absolute -top-7 right-0 flex flex-end z-30 overflow-visible md:flex gap-1.5">
                                        <IconButton
                                            icon={copiedMd ? <Check size={13} /> : <Copy size={13} />}
                                            label={copiedMd ? "Copied" : "Copy MD"}
                                            onClick={() => copy(formattedMarkdownTable, setCopiedMd)}
                                        />

                                        <IconButton
                                            icon={copiedExcel ? <Check size={13} /> : <Table size={13} />}
                                            label={copiedExcel ? "Copied Excel" : "Copy for Excel"}
                                            onClick={() => copy(excel, setCopiedExcel)}
                                        />

                                        <IconButton
                                            icon={downloading ? <Check size={13} /> : <Download size={13} />}
                                            label={downloading ? "Downloading..." : "Download CSV"}
                                            onClick={downloadCSV}
                                        />
                                    </div>
                                    <div className="overflow-auto w-full max-h-[70vh]">
                                        <table
                                            className="border-collapse border border-gray-300 w-full text-sm"
                                            {...props}
                                        >
                                            {children}
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );

                },

                th: (props) => (
                    <th
                        className="border border-[#1d827d] bg-[#249791] text-white px-2.5 py-1.5 text-left font-bold sticky top-0 z-10"
                        style={{ whiteSpace: "nowrap" }}
                        {...props}
                    />
                ),

                td: ({ node, children, ...props }) => {
                    let text = "";
                    const extractText = (el) => {
                        if (!el) return "";
                        if (typeof el === "string" || typeof el === "number") return String(el);
                        if (Array.isArray(el)) return el.map(extractText).join("");
                        if (el.props && el.props.children) return extractText(el.props.children);
                        return "";
                    };
                    text = extractText(children).trim();

                    const isPositive = /^\+[\d.,]+%?$/.test(text);
                    const isNegative = /^-[\d.,]+%?$/.test(text);

                    let className = "border border-gray-300 px-2 py-1 align-top";
                    if (isPositive) {
                        className += " text-green-600 font-semibold";
                    } else if (isNegative) {
                        className += " text-red-600 font-semibold";
                    }

                    return (
                        <td className={className} {...props}>
                            {children}
                        </td>
                    );
                },

                code: MarkdownCode,

                blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-gray-300 bg-gray-50 pl-3 pr-2 py-1 my-2 italic text-gray-700 rounded-r">
                        {children}
                    </blockquote>
                ),

                hr: () => <hr className="my-4 border-t border-gray-200" />,

                a: ({ href, children, ...rest }) => (
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                        {...rest}
                    >
                        {children}
                    </a>
                ),

                h1: (props) => <h1 className="text-2xl font-bold mb-3" {...props} />,
                h2: (props) => <h2 className="text-xl font-bold mb-3" {...props} />,
                h3: (props) => <h3 className="text-lg font-semibold mb-2" {...props} />,
                h4: (props) => <h4 className="text-base font-semibold mb-2" {...props} />,
                h5: (props) => <h5 className="text-sm font-semibold mb-1" {...props} />,
                h6: (props) => <h6 className="text-xs font-semibold mb-1" {...props} />,

                ul: (props) => <ul className="list-disc ml-6 my-2 space-y-1" {...props} />,
                ol: (props) => <ol className="list-decimal ml-6 my-2 space-y-1" {...props} />,

                li: ({ checked, children, ...rest }) => {
                    if (checked === true || checked === false) {
                        return (
                            <li className="flex gap-2 items-start" {...rest}>
                                <input type="checkbox" checked={checked} readOnly />
                                <span>{children}</span>
                            </li>
                        );
                    }
                    return <li {...rest}>{children}</li>;
                },

                img: ({ src, alt }) => (
                    <img
                        src={src}
                        alt={alt}
                        className="max-w-full rounded-md my-3 shadow-sm"
                    />
                ),

                mark: ({ children }) => (
                    <mark className="bg-yellow-200 px-1 rounded">{children}</mark>
                ),

                sup: (props) => <sup className="text-xs align-super" {...props} />,
                sub: (props) => <sub className="text-xs align-sub" {...props} />,

                dl: (props) => <dl className="my-4" {...props} />,
                dt: (props) => <dt className="font-semibold" {...props} />,
                dd: (props) => <dd className="ml-4 text-gray-700" {...props} />,

                thematicBreak: () => (
                    <hr className="my-6 border-gray-300 opacity-70" />
                ),
            }}
        >
            {cleaned}
        </ReactMarkdown>
    );
}
