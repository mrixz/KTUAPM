import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evalDir = path.resolve(__dirname, '../../../evaluation');
const groundTruthDir = path.join(evalDir, 'ground-truth');
const syntheticDir = path.join(evalDir, 'synthetic');

export class SyntheticDatasetGenerator {
  /**
   * Generate 500+ diverse benchmark certificate samples and matching ground-truth labels
   * @param {number} [count=520]
   * @returns {Promise<{ dataset: Array<Object>, summary: Object }>}
   */
  static async generateBenchmarkDataset(count = 520) {
    if (!fsSync.existsSync(groundTruthDir)) {
      fsSync.mkdirSync(groundTruthDir, { recursive: true });
    }
    if (!fsSync.existsSync(syntheticDir)) {
      fsSync.mkdirSync(syntheticDir, { recursive: true });
    }

    const categories = [
      {
        cat2019: 'National Initiatives',
        cat2024: 'Community Service & National Outreach',
        subcategories: ['NSS', 'NCC'],
        templates: [
          'National Service Scheme (NSS) Certificate of Merit for completing 240 hours of community service and 7-day special camp.',
          'National Cadet Corps (NCC) Unit Directorate Certificate for passing B Certificate with Grade A.',
          'NSS Directorate Kerala - Certificate of Appreciation for Disaster Relief Camp Volunteer.',
          'NCC Republic Day Camp (RDC) Contingent Participant Certificate.'
        ],
        levels: ['National', 'State / Inter-University', 'College / Institution'],
        achievements: ['C Certificate', 'B Certificate', 'Special Camp / 2 Years', 'Annual Participation / 1 Year', 'Participation'],
        weight: 0.15
      },
      {
        cat2019: 'Sports & Games',
        cat2024: 'Sports, Fitness & Athletics',
        subcategories: ['Athletics', 'Badminton', 'Football', 'Basketball', 'Table Tennis'],
        templates: [
          'APJ Abdul Kalam Technological University Inter-Collegiate Athletics Meet Certificate of Merit - 100m Sprint Winner.',
          'KTU Zonal Basketball Tournament Runner-Up Certificate.',
          'All India Inter-University Badminton Championship Participation Certificate.',
          'Annual College Sports Meet - 4x100m Relay Gold Medalist.'
        ],
        levels: ['National', 'State / Inter-University', 'Zonal / District', 'College / Institution'],
        achievements: ['First', 'Second', 'Third', 'Participation'],
        weight: 0.15
      },
      {
        cat2019: 'Cultural Activities',
        cat2024: 'Creative Arts & Cultural Engagement',
        subcategories: ['Music', 'Classical Dance', 'Drama', 'Debate', 'Literary'],
        templates: [
          'KTU University Youth Festival (Dhwani) - Classical Music Competition First Prize Winner.',
          'Inter-Collegiate Literary & Debate Fest - English Debate Runner Up.',
          'State Level Street Play / Drama Festival Best Production Winner.',
          'College Arts Fest Sargam - Group Dance Participation Certificate.'
        ],
        levels: ['State / Inter-University', 'Zonal / District', 'College / Institution'],
        achievements: ['First', 'Second', 'Third', 'Participation'],
        weight: 0.15
      },
      {
        cat2019: 'Professional Self-Initiatives',
        cat2024: 'Technical Skilling & Professional Mastery',
        subcategories: ['Hackathon', 'Workshop', 'Conference', 'MOOC', 'Internship'],
        templates: [
          'Smart India Hackathon (SIH) National Finalist & 1st Runner-Up Certificate for AI Healthcare solution.',
          'IEEE International Conference on Smart Systems - Technical Research Paper Presentation Certificate.',
          'NPTEL Online Certification (Elite+Gold) for 12-Week Course on Deep Learning with Score 92%.',
          '3-Day Hands-on Workshop on Full-Stack Microservices Architecture & Cloud Deployment.',
          '4-Week Summer Industrial Internship Completion Certificate from TechCorp Kerala Ltd.',
          'State Level 36-Hour Hackathon Winner Certificate - Team Antigravity.'
        ],
        levels: ['International', 'National', 'State / Inter-University', 'College / Institution'],
        achievements: ['First', 'Second', 'Third', 'Finalist', 'Presentation', 'Completed', 'Participation'],
        weight: 0.35
      },
      {
        cat2019: 'Entrepreneurship & Innovation',
        cat2024: 'Innovation, Research & Entrepreneurship',
        subcategories: ['Startup', 'Patent', 'Prototype', 'Ideathon'],
        templates: [
          'Kerala Startup Mission (KSUM) Idea Grant & Incubation Recognition Certificate.',
          'Indian Patent Office - Patent Published Certificate for IoT Agricultural Monitoring Device.',
          'National Innovation Challenge Winner for Smart Assistive Device Prototype.',
          'IEDC Summit State Level Startup Pitch Fest 2nd Prize.'
        ],
        levels: ['National', 'State / Inter-University', 'College / Institution'],
        achievements: ['Patent Published / Filed', 'Incubated Startup / Prototype', 'First', 'Second', 'Participation'],
        weight: 0.10
      },
      {
        cat2019: 'Leadership & Management',
        cat2024: 'Institutional Leadership & Civic Governance',
        subcategories: ['Student Council', 'Event Coordinator', 'Volunteer Lead', 'Class Representative'],
        templates: [
          'Certificate of Leadership - Elected Class Representative for Academic Year 2023-24.',
          'National Technical Symposium (Adhyaya) - Chief Student Organizing Convenor.',
          'IEEE Student Branch Chairperson Appointment & Leadership Excellence Certificate.',
          'College National NSS Volunteer Team Lead Certificate.'
        ],
        levels: ['College / Institution'],
        achievements: ['Office Bearer / Executive', 'Club President / Lead Coordinator', 'Major Event Convenor', 'Participation'],
        weight: 0.10
      }
    ];

    const dataset = [];
    let idCounter = 1;

    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      let cumulativeWeight = 0;
      let selectedCat = categories[0];

      for (const cat of categories) {
        cumulativeWeight += cat.weight;
        if (rand <= cumulativeWeight) {
          selectedCat = cat;
          break;
        }
      }

      const template = selectedCat.templates[Math.floor(Math.random() * selectedCat.templates.length)];
      const subcategory = selectedCat.subcategories[Math.floor(Math.random() * selectedCat.subcategories.length)];
      const level = selectedCat.levels[Math.floor(Math.random() * selectedCat.levels.length)];
      const achievement = selectedCat.achievements[Math.floor(Math.random() * selectedCat.achievements.length)];

      const certId = `CERT_BENCH_${String(idCounter).padStart(4, '0')}`;
      const scheme = i % 2 === 0 ? '2019' : '2024';
      const expectedCategory = scheme === '2019' ? selectedCat.cat2019 : selectedCat.cat2024;
      
      const year = 2021 + (i % 4);
      const month = 1 + (i % 12);
      const day = 1 + (i % 28);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Simulate edge cases (e.g. 5% ambiguous / needs review, 2% low quality)
      const isEdgeCase = i % 25 === 0;
      const textContent = isEdgeCase
        ? `Certificate of Attendance. Presented to student for visiting session on ${dateStr}. Ref: #ABC`
        : `${template} Issued to KTU Student (Reg: TKM${year}CS${String(i % 100).padStart(3, '0')}) on ${dateStr}. Level: ${level}. Award: ${achievement}. Certificate No: KTU-ACT-${year}-${idCounter}.`;

      const item = {
        id: certId,
        filename: `${certId}_${subcategory.replace(/\s+/g, '_')}.pdf`,
        scheme,
        textContent,
        mimeType: 'application/pdf',
        groundTruth: {
          expectedCategory,
          expectedSubcategory: subcategory,
          expectedLevel: level,
          expectedAchievement: achievement,
          isEdgeCase,
          expectedAutomated: !isEdgeCase
        }
      };

      dataset.push(item);
      idCounter++;
    }

    // Save ground truth dataset
    const groundTruthFilePath = path.join(groundTruthDir, 'benchmark_500_ground_truth.json');
    await fs.writeFile(groundTruthFilePath, JSON.stringify(dataset, null, 2));

    return {
      dataset,
      groundTruthFilePath,
      totalCount: dataset.length
    };
  }
}
