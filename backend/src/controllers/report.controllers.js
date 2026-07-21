import { photographyConfig } from "../config/photographyConfig.js";
import { buildParameterBreakdown } from "../services/reportUtils.js";
import { generateLLMExplanation } from "../services/llm.service.js";
import { generatePDF } from "../services/pdf.service.js";

export const generateReport = async (req, res) => {
  try {
    const { placeData, photographyType, dateTime, astronomyAndWeather } = req.body;

    const weights = photographyConfig[photographyType].weights;

    const parameterBreakdown = buildParameterBreakdown(
      placeData.parameters,
      weights
    );

    let explanation = await generateLLMExplanation({
      placeData,
      photographyType,
      dateTime,
      parameterBreakdown,
      astronomyAndWeather
    });

    if (!explanation || typeof explanation !== "object") {
      explanation = {
        executiveSummary: "",
        comparativeReasoning: "",
        bestTimeRecommendation: "",
        warnings: ""
      };
    }

    const pdfPath = await generatePDF({
      placeData,
      photographyType,
      dateTime,
      parameterBreakdown,
      explanation
    });

    return res.json({
      success: true,
      pdfPath,
      parameterBreakdown,   
      explanation
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};