import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import chromium from "@sparticuz/chromium";

export const generatePDF = async ({
  placeData,
  photographyType,
  dateTime,
  parameterBreakdown,
  explanation
}) => {

  const browser = await puppeteer.launch({
    headless: true,
    args: chromium.args,
    executablePath: await chromium.executablePath()
  });
  const page = await browser.newPage();

  

  const getInterpretation = (score) => {
    if (score >= 0.8) return "Excellent";
    if (score >= 0.6) return "Good";
    if (score >= 0.4) return "Acceptable";
    if (score >= 0.2) return "Poor";
    return "Very Poor";
  };

  // Photography-type-specific labels — mirrors PHOTO_WORDS in SuitabilityMeter.jsx
  const PHOTO_WORDS = {
    astrophotography: { prime: "Stellar",   frame: "Clear",      soft: "Hazy",     off: "Murky"   },
    wedding:          { prime: "Dreamy",    frame: "Elegant",    soft: "Basic",    off: "Avoid"   },
    birthday:         { prime: "Festive",   frame: "Lively",     soft: "Okay",     off: "Dull"    },
    birthday_event:   { prime: "Festive",   frame: "Lively",     soft: "Okay",     off: "Dull"    },
    landscape:        { prime: "Epic",      frame: "Scenic",     soft: "Decent",   off: "Flat"    },
    street:           { prime: "Iconic",    frame: "Buzzing",    soft: "Meh",      off: "Dead"    },
    portrait:         { prime: "Flawless",  frame: "Flattering", soft: "Passable", off: "Harsh"   },
    nature:           { prime: "Pristine",  frame: "Lush",       soft: "Okay",     off: "Barren"  },
    architecture:     { prime: "Striking",  frame: "Solid",      soft: "Generic",  off: "Bland"   },
    sports:           { prime: "Electric",  frame: "Dynamic",    soft: "Sluggish", off: "Dead"    },
    default:          { prime: "Perfect",   frame: "Go For It",  soft: "Timepass", off: "Skip"    },
  };

  const typeKey = (photographyType || "").toLowerCase().replace(/\s+/g, "_");
  const words   = PHOTO_WORDS[typeKey] ?? PHOTO_WORDS.default;

  const score100 = Math.round((placeData.finalScore || 0) * 100);

  // Tier thresholds match the frontend TIERS: prime ≥ 80, frame ≥ 60, soft ≥ 40, off < 40
  let label    = words.off;
  let colorHex = "#c0614a";  // red-ish
  if      (score100 >= 80) { label = words.prime; colorHex = "#c8a96e"; }  // gold
  else if (score100 >= 60) { label = words.frame; colorHex = "#5bbf6a"; }  // green
  else if (score100 >= 40) { label = words.soft;  colorHex = "#d4a020"; }  // amber

  const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${placeData.location?.lat},${placeData.location?.lng}&travelmode=driving`;
  const area = placeData.area || placeData.vicinity || "Unknown Area";

  // Try to load the custom background.png from the backend root (won't be present on cloud, gracefully degrades)
  const customBgPath = path.resolve("background.png");
  let bgBase64 = "";
  if (fs.existsSync(customBgPath)) {
    const bgData = fs.readFileSync(customBgPath);
    bgBase64 = "data:image/png;base64," + bgData.toString("base64");
  }
  // No local fallback — the body background-color (#dcf2f5) handles the cloud case cleanly.
  explanation = explanation || {
  executiveSummary: "",
  comparativeReasoning: "",
  bestTimeRecommendation: "",
  warnings: ""
};

placeData.location = placeData.location || { lat: 0, lng: 0 };
  const arcLength = 314.159; 
  const dashOffset = arcLength * (1 - (score100 / 100));

  const meterSvg = `
    <svg viewBox="0 0 300 160" width="300" height="160" style="margin: 10px auto 5px auto; display: block;">
      <path d="M 25,140 A 100,100 0 0,1 275,140" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="26" stroke-linecap="round"/>
      <path d="M 25,140 A 100,100 0 0,1 275,140" fill="none" stroke="${colorHex}" stroke-width="26" stroke-linecap="round" stroke-dasharray="${arcLength}" stroke-dashoffset="${dashOffset}"/>
      <text x="150" y="130" font-size="46" font-family="'Nunito', sans-serif" font-weight="900" fill="#0f172a" text-anchor="middle">${score100}%</text>
    </svg>
  `;

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <title>${placeData.name || "Location Report"} - ${dateTime.split("T")[0]}</title>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 0; }
        
        * { box-sizing: border-box; }
        
        body {
          font-family: 'Inter', sans-serif;
          margin: 0;
          padding: 0;
          color: #334155;
          background-color: #dcf2f5;
          ${bgBase64 ? `background-image: url('${bgBase64}');` : ''}
          /* Setting exact A4 sizing with repeat-y is the ONLY way Puppeteer reliably prints page backgrounds! */
          background-size: 210mm 297mm; 
          background-position: top center;
          background-repeat: repeat-y;
          border-top: 1px solid transparent;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .page-container {
          padding: 40px;
        }

        .box-wrapper {
          padding-top: 25px;
          page-break-inside: avoid;
        }

        .glass-box {
          background: rgba(255, 255, 255, 0.45); /* Highly transparent so background shines! */
          border-radius: 16px;
          padding: 25px;
          margin-bottom: 0px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }

        .header-box {
          background: rgba(255, 255, 255, 0.65);
          border-radius: 16px;
          padding: 35px 25px;
          margin-top: 10px;
          margin-bottom: 0px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.9);
          text-align: center;
          page-break-inside: avoid;
        }

        h1 {
          font-family: 'Nunito', sans-serif;
          font-size: 34px;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 8px 0;
          line-height: 1.2;
        }

        .subtitle {
          font-family: 'Nunito', sans-serif;
          font-size: 15px;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 800;
          margin-bottom: 15px;
        }

        .meter-label {
          font-family: 'Nunito', sans-serif;
          font-size: 22px;
          color: ${colorHex};
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-top: 5px;
        }

        .date-text {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          margin-top: 10px;
        }

        h2 {
          font-family: 'Nunito', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 0;
          margin-bottom: 12px;
          border-bottom: 2px solid rgba(15, 23, 42, 0.05);
          padding-bottom: 8px;
          display: flex;
          align-items: center;
        }
        
        h2 span {
          color: #0ea5e9;
          margin-right: 10px;
        }

        p {
          line-height: 1.6;
          color: #334155;
          font-size: 14px;
          margin: 0;
        }

        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-top: 10px;
          background: rgba(255, 255, 255, 0.85); /* tables need a bit more contrast for reading */
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(255,255,255,0.9);
        }

        th {
          background: #f8fafc;
          color: #475569;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          padding: 12px;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 1px;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
        }

        td {
          padding: 12px;
          color: #0f172a;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
        }

        tr:last-child td { border-bottom: none; }

        .alert-box {
          background: rgba(254, 242, 242, 0.8);
          border-left: 5px solid #ef4444;
          padding: 15px;
          border-radius: 10px;
          color: #b91c1c;
          font-weight: 500;
        }

        .nav-btn {
          display: inline-block;
          background: #0ea5e9;
          color: white;
          padding: 10px 22px;
          border-radius: 8px;
          text-decoration: none;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 14px;
          margin-top: 10px;
          box-shadow: 0 4px 10px rgba(14, 165, 233, 0.2);
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        
        <div class="header-box">
          <h1>${placeData.name || 'Location Report'}</h1>
          <div class="subtitle">${photographyType} PHOTOGRAPHY</div>
          
          ${meterSvg}
          
          <div class="meter-label">${label}</div>
          <div class="date-text">Evaluated on: ${dateTime}</div>
        </div>

        <div class="box-wrapper">
          <div class="glass-box">
            <h2><span>1.</span> Executive Summary</h2>
            <p>${explanation.executiveSummary || "Summary not available."}</p>
          </div>
        </div>

        <div class="box-wrapper">
          <div class="glass-box">
            <h2><span>2.</span> Parameter Evaluation</h2>
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th style="text-align: center;">Raw Score</th>
                  <th style="text-align: center;">Weight</th>
                  <th style="text-align: center;">Interpretation</th>
                </tr>
              </thead>
              <tbody>
                ${Object.keys(parameterBreakdown || {}).length === 0
                  ? `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px;">No parameter data available for this location.</td></tr>`
                  : Object.entries(parameterBreakdown).map(([key, val]) => {
                    let statColor = val.score >= 0.6 ? '#10b981' : val.score <= 0.3 ? '#ef4444' : '#f59e0b';
                    return `
                    <tr>
                      <td style="text-transform: capitalize; font-weight: 600; color: #0f172a;">${key.replace(/([A-Z])/g, ' $1').trim()}</td>
                      <td style="text-align: center; font-weight: 500;">${val.score.toFixed(2)}</td>
                      <td style="text-align: center; color: #64748b;">${(val.weight * 100).toFixed(0)}%</td>
                      <td style="text-align: center; font-weight: 800; color: ${statColor};">${getInterpretation(val.score)}</td>
                    </tr>
                    `;
                  }).join("")
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="box-wrapper">
          <div class="glass-box">
            <h2><span>3.</span> Comparative Reasoning</h2>
            <p>${explanation.comparativeReasoning || "Details not available."}</p>
          </div>
        </div>

        <div class="box-wrapper">
          <div class="glass-box">
            <h2><span>4.</span> Best Time Recommendation</h2>
            <p>${explanation.bestTimeRecommendation || "Use local forecast for updates."}</p>
          </div>
        </div>

        <div class="box-wrapper">
          <div class="glass-box">
            <h2><span>5.</span> Warnings & Disclaimers</h2>
            <div class="alert-box">
              ${explanation.warnings || "Take general safety precautions."}
            </div>
          </div>
        </div>

        <div class="box-wrapper">
          <div class="glass-box">
            <h2><span>6.</span> Navigation Information</h2>
            <p style="margin-bottom: 8px;"><strong>Area:</strong> ${area}</p>
            <p style="margin-bottom: 20px;"><strong>Coordinates:</strong> ${placeData.location?.lat}, ${placeData.location?.lng}</p>
            <a href="${mapsLink}" class="nav-btn">Get Driving Directions ↗</a>
          </div>
        </div>

      </div>
    </body>
  </html>
  `;

  await page.setContent(html, { waitUntil: "networkidle0" });

  const safeName = (placeData.name || "Location").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeDate = dateTime.split("T")[0].replace(/[^a-zA-Z0-9]/g, "");
  const fileName = `${safeName}_Report_${safeDate}.pdf`;

  // Generate PDF into memory — no filesystem writes needed (cloud-safe)
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true
  });

  await browser.close();

  return { buffer: pdfBuffer, fileName };
};