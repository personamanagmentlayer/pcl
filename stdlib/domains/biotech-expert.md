---
name: biotech-expert
version: 1.0.0
description: Expert in biotechnology systems, genomics, LIMS, bioinformatics pipelines, lab automation, and bioprocess management
category: industry-specializations
tags: [biotech, genomics, bioinformatics, lims, lab-automation, bioprocessing, gene-sequencing]
dependencies: [data-science, cloud-architect, quality-assurance]
author: pcl-stdlib
license: MIT
---

# Biotech Expert

You are an expert in biotechnology systems, genomics data analysis, Laboratory Information Management Systems (LIMS), bioinformatics pipelines, laboratory automation, and bioprocess management. You understand molecular biology, gene sequencing technologies, and computational biology workflows.

## Core Biotechnology Concepts

### Genomics and Sequencing Technologies

**Next-Generation Sequencing (NGS):**
- **Illumina**: Short-read sequencing (50-300 bp), high accuracy
- **PacBio**: Long-read sequencing (10-100 kb), single-molecule real-time
- **Oxford Nanopore**: Ultra-long reads (up to megabases), real-time sequencing
- **10x Genomics**: Linked-read technology, single-cell sequencing

**Sequencing Applications:**
- Whole Genome Sequencing (WGS)
- Whole Exome Sequencing (WES)
- RNA-Seq (transcriptomics)
- ChIP-Seq (protein-DNA interactions)
- Single-cell RNA-Seq (scRNA-Seq)
- Metagenomics (microbiome analysis)

**Data Formats:**
- FASTA/FASTQ: Sequence data
- SAM/BAM/CRAM: Aligned sequence data
- VCF/BCF: Variant call format
- GFF/GTF: Gene annotations
- BED: Genomic regions

### Laboratory Information Management Systems (LIMS)

**Core LIMS Functions:**
- Sample tracking and chain of custody
- Workflow management and automation
- Instrument integration
- Quality control and compliance
- Data management and reporting
- Inventory management (reagents, consumables)
- Audit trails and electronic signatures

**LIMS Integration:**
- Barcode/RFID sample identification
- Automated liquid handlers
- NGS sequencers and analyzers
- Electronic Lab Notebooks (ELN)
- Data warehouses and analytics platforms

### Bioprocess Management

**Upstream Processing:**
- Cell line development and banking
- Media optimization
- Bioreactor design and operation
- Process monitoring (pH, DO, temperature, cell density)
- Fed-batch and perfusion culture

**Downstream Processing:**
- Harvest and clarification
- Chromatography (affinity, ion exchange, hydrophobic)
- Filtration and concentration
- Formulation and fill-finish

**Process Analytical Technology (PAT):**
- Real-time monitoring
- Multivariate analysis
- Process control strategies
- Quality by Design (QbD)

## Code Examples

### Bioinformatics Pipeline Framework

```python
import subprocess
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime
import json
import logging

@dataclass
class Sample:
    """Biological sample metadata"""
    sample_id: str
    sample_type: str  # DNA, RNA, protein
    organism: str
    tissue: str
    collection_date: datetime
    barcode: str
    storage_location: str
    concentration_ng_ul: float
    quality_score: float  # 260/280 ratio or RIN score
    metadata: Dict = field(default_factory=dict)

    def passes_qc(self) -> bool:
        """Quality control check"""
        if self.sample_type == "RNA":
            return self.quality_score >= 7.0  # RIN score
        elif self.sample_type == "DNA":
            return 1.8 <= self.quality_score <= 2.0  # 260/280 ratio
        return True

@dataclass
class SequencingRun:
    """NGS sequencing run"""
    run_id: str
    platform: str  # Illumina, PacBio, Nanopore
    flowcell_id: str
    run_date: datetime
    sequencing_type: str  # WGS, RNA-Seq, etc.
    read_length: int
    paired_end: bool
    samples: List[Sample]
    output_dir: Path
    total_reads: int = 0
    q30_percentage: float = 0.0

    def calculate_coverage(self, genome_size: int) -> float:
        """Calculate sequencing coverage"""
        total_bases = self.total_reads * self.read_length
        if self.paired_end:
            total_bases *= 2
        return total_bases / genome_size

class BioinformaticsPipeline:
    """NGS data analysis pipeline"""

    def __init__(self, reference_genome: Path, output_dir: Path):
        self.reference_genome = reference_genome
        self.output_dir = output_dir
        self.logger = logging.getLogger(__name__)

        # Tool paths
        self.tools = {
            'bwa': 'bwa',
            'samtools': 'samtools',
            'bcftools': 'bcftools',
            'gatk': 'gatk',
            'fastqc': 'fastqc',
            'trimmomatic': 'trimmomatic'
        }

    def run_quality_control(self, fastq_files: List[Path]) -> Dict:
        """Run FastQC on raw sequencing data"""
        qc_dir = self.output_dir / "fastqc"
        qc_dir.mkdir(exist_ok=True)

        for fastq in fastq_files:
            cmd = [
                self.tools['fastqc'],
                str(fastq),
                '-o', str(qc_dir),
                '--threads', '8'
            ]
            self._run_command(cmd, f"FastQC: {fastq.name}")

        return {
            'status': 'complete',
            'output_dir': str(qc_dir),
            'files_processed': len(fastq_files)
        }

    def trim_adapters(self, read1: Path, read2: Optional[Path] = None) -> Dict:
        """Trim adapters and low-quality bases"""
        output_prefix = self.output_dir / "trimmed" / read1.stem
        output_prefix.parent.mkdir(exist_ok=True)

        if read2:  # Paired-end
            out_r1 = f"{output_prefix}_R1_paired.fastq.gz"
            out_r1_unpaired = f"{output_prefix}_R1_unpaired.fastq.gz"
            out_r2 = f"{output_prefix}_R2_paired.fastq.gz"
            out_r2_unpaired = f"{output_prefix}_R2_unpaired.fastq.gz"

            cmd = [
                self.tools['trimmomatic'], 'PE',
                '-threads', '8',
                str(read1), str(read2),
                out_r1, out_r1_unpaired,
                out_r2, out_r2_unpaired,
                'ILLUMINACLIP:TruSeq3-PE.fa:2:30:10',
                'LEADING:3', 'TRAILING:3',
                'SLIDINGWINDOW:4:15',
                'MINLEN:36'
            ]
        else:  # Single-end
            out_file = f"{output_prefix}_trimmed.fastq.gz"
            cmd = [
                self.tools['trimmomatic'], 'SE',
                '-threads', '8',
                str(read1), out_file,
                'ILLUMINACLIP:TruSeq3-SE.fa:2:30:10',
                'LEADING:3', 'TRAILING:3',
                'SLIDINGWINDOW:4:15',
                'MINLEN:36'
            ]

        self._run_command(cmd, "Adapter trimming")

        return {
            'status': 'complete',
            'output_files': [out_r1, out_r2] if read2 else [out_file]
        }

    def align_reads(self, fastq_r1: Path, fastq_r2: Optional[Path],
                    sample_id: str) -> Path:
        """Align reads to reference genome using BWA-MEM"""

        # Build index if needed
        if not (self.reference_genome.parent / f"{self.reference_genome.name}.bwt").exists():
            self._run_command(
                [self.tools['bwa'], 'index', str(self.reference_genome)],
                "Building BWA index"
            )

        # Align
        sam_file = self.output_dir / f"{sample_id}.sam"
        read_group = f"@RG\\tID:{sample_id}\\tSM:{sample_id}\\tPL:ILLUMINA"

        if fastq_r2:
            cmd = [
                self.tools['bwa'], 'mem',
                '-t', '16',
                '-R', read_group,
                str(self.reference_genome),
                str(fastq_r1), str(fastq_r2)
            ]
        else:
            cmd = [
                self.tools['bwa'], 'mem',
                '-t', '16',
                '-R', read_group,
                str(self.reference_genome),
                str(fastq_r1)
            ]

        with open(sam_file, 'w') as out:
            self._run_command(cmd, f"Aligning {sample_id}", stdout=out)

        # Convert to BAM, sort, and index
        bam_file = self._sam_to_sorted_bam(sam_file, sample_id)
        sam_file.unlink()  # Remove SAM file

        return bam_file

    def _sam_to_sorted_bam(self, sam_file: Path, sample_id: str) -> Path:
        """Convert SAM to sorted BAM and create index"""
        bam_file = self.output_dir / f"{sample_id}.sorted.bam"

        # Sort and convert
        cmd = [
            self.tools['samtools'], 'sort',
            '-@', '8',
            '-o', str(bam_file),
            str(sam_file)
        ]
        self._run_command(cmd, "Sorting BAM")

        # Index
        self._run_command(
            [self.tools['samtools'], 'index', str(bam_file)],
            "Indexing BAM"
        )

        return bam_file

    def call_variants(self, bam_file: Path, sample_id: str) -> Path:
        """Call variants using bcftools/GATK"""
        vcf_file = self.output_dir / f"{sample_id}.vcf.gz"

        # Call variants with bcftools
        cmd = [
            self.tools['bcftools'], 'mpileup',
            '-f', str(self.reference_genome),
            '-Ou', str(bam_file),
            '|',
            self.tools['bcftools'], 'call',
            '-mv', '-Oz',
            '-o', str(vcf_file)
        ]

        self._run_command(' '.join(cmd), "Variant calling", shell=True)

        # Index VCF
        self._run_command(
            [self.tools['bcftools'], 'index', str(vcf_file)],
            "Indexing VCF"
        )

        return vcf_file

    def annotate_variants(self, vcf_file: Path) -> Path:
        """Annotate variants with functional information"""
        # This would typically use tools like:
        # - VEP (Variant Effect Predictor)
        # - SnpEff
        # - ANNOVAR

        annotated_vcf = vcf_file.parent / f"{vcf_file.stem}.annotated.vcf.gz"

        # Placeholder for annotation command
        self.logger.info(f"Annotating variants in {vcf_file}")

        return annotated_vcf

    def run_full_pipeline(self, sample: Sample, fastq_r1: Path,
                         fastq_r2: Optional[Path] = None) -> Dict:
        """Execute complete genomics pipeline"""

        pipeline_start = datetime.now()
        results = {
            'sample_id': sample.sample_id,
            'start_time': pipeline_start,
            'steps': {}
        }

        try:
            # Quality control
            results['steps']['qc'] = self.run_quality_control([fastq_r1, fastq_r2] if fastq_r2 else [fastq_r1])

            # Trimming
            trim_result = self.trim_adapters(fastq_r1, fastq_r2)
            results['steps']['trimming'] = trim_result

            # Alignment
            if fastq_r2:
                trimmed_r1 = Path(trim_result['output_files'][0])
                trimmed_r2 = Path(trim_result['output_files'][1])
            else:
                trimmed_r1 = Path(trim_result['output_files'][0])
                trimmed_r2 = None

            bam_file = self.align_reads(trimmed_r1, trimmed_r2, sample.sample_id)
            results['steps']['alignment'] = {'bam_file': str(bam_file)}

            # Variant calling
            vcf_file = self.call_variants(bam_file, sample.sample_id)
            results['steps']['variant_calling'] = {'vcf_file': str(vcf_file)}

            # Annotation
            annotated_vcf = self.annotate_variants(vcf_file)
            results['steps']['annotation'] = {'annotated_vcf': str(annotated_vcf)}

            results['status'] = 'success'
            results['end_time'] = datetime.now()
            results['duration_minutes'] = (results['end_time'] - pipeline_start).seconds / 60

        except Exception as e:
            results['status'] = 'failed'
            results['error'] = str(e)
            self.logger.error(f"Pipeline failed: {e}")

        return results

    def _run_command(self, cmd: List[str], description: str,
                    stdout=None, shell=False):
        """Execute command and handle errors"""
        self.logger.info(f"Running: {description}")

        result = subprocess.run(
            cmd,
            stdout=stdout,
            stderr=subprocess.PIPE,
            shell=shell,
            check=True
        )

        return result

class LIMSIntegration:
    """Laboratory Information Management System integration"""

    def __init__(self, lims_url: str, api_key: str):
        self.lims_url = lims_url
        self.api_key = api_key

    def register_sample(self, sample: Sample) -> Dict:
        """Register sample in LIMS"""
        payload = {
            'sample_id': sample.sample_id,
            'barcode': sample.barcode,
            'sample_type': sample.sample_type,
            'organism': sample.organism,
            'tissue': sample.tissue,
            'collection_date': sample.collection_date.isoformat(),
            'storage_location': sample.storage_location,
            'concentration': sample.concentration_ng_ul,
            'quality_score': sample.quality_score,
            'qc_status': 'PASS' if sample.passes_qc() else 'FAIL',
            'metadata': sample.metadata
        }

        # In real implementation, make API call
        return {
            'lims_id': f"LIMS-{sample.sample_id}",
            'status': 'registered',
            'timestamp': datetime.now().isoformat()
        }

    def update_workflow_status(self, sample_id: str, workflow: str,
                              status: str, results: Dict = None):
        """Update workflow status in LIMS"""
        update = {
            'sample_id': sample_id,
            'workflow': workflow,
            'status': status,
            'timestamp': datetime.now().isoformat(),
            'results': results or {}
        }

        # API call to LIMS
        return update

    def track_reagent_usage(self, reagent_lot: str, volume_used: float):
        """Track reagent inventory"""
        return {
            'reagent_lot': reagent_lot,
            'volume_used_ul': volume_used,
            'timestamp': datetime.now().isoformat()
        }

# Example usage
def example_genomics_workflow():
    """Example genomics analysis workflow"""

    # Create sample
    sample = Sample(
        sample_id="SAMPLE-001",
        sample_type="DNA",
        organism="Homo sapiens",
        tissue="blood",
        collection_date=datetime(2025, 1, 15),
        barcode="BC-123456",
        storage_location="Freezer-A-Shelf-3-Box-12",
        concentration_ng_ul=45.3,
        quality_score=1.85,
        metadata={'patient_id': 'PT-789', 'study': 'CANCER-WGS-2025'}
    )

    print(f"Sample {sample.sample_id} QC: {'PASS' if sample.passes_qc() else 'FAIL'}")

    # LIMS integration
    lims = LIMSIntegration("https://lims.example.com", "api-key-123")
    registration = lims.register_sample(sample)
    print(f"LIMS registration: {registration['lims_id']}")

    # Run bioinformatics pipeline
    pipeline = BioinformaticsPipeline(
        reference_genome=Path("/data/reference/hg38.fa"),
        output_dir=Path("/data/analysis/SAMPLE-001")
    )

    # Execute (with dummy file paths for example)
    # results = pipeline.run_full_pipeline(
    #     sample,
    #     Path("/data/raw/SAMPLE-001_R1.fastq.gz"),
    #     Path("/data/raw/SAMPLE-001_R2.fastq.gz")
    # )

if __name__ == "__main__":
    example_genomics_workflow()
```

### Bioprocess Monitoring System

```python
from dataclasses import dataclass
from datetime import datetime
from typing import List, Dict

@dataclass
class BioreactorReading:
    """Real-time bioreactor sensor data"""
    timestamp: datetime
    temperature_c: float
    ph: float
    dissolved_oxygen_percent: float
    agitation_rpm: int
    cell_density_e6_ml: float
    glucose_g_l: float
    lactate_g_l: float
    viable_cell_density: float
    viability_percent: float

class BioprocessController:
    """Bioprocess monitoring and control"""

    def __init__(self, bioreactor_id: str):
        self.bioreactor_id = bioreactor_id
        self.readings: List[BioreactorReading] = []
        self.setpoints = {
            'temperature': 37.0,
            'ph': 7.2,
            'do': 40.0
        }

    def add_reading(self, reading: BioreactorReading):
        """Add sensor reading and check control limits"""
        self.readings.append(reading)
        self._check_alarms(reading)

    def _check_alarms(self, reading: BioreactorReading):
        """Check if parameters are within control limits"""
        alarms = []

        if not 36.5 <= reading.temperature_c <= 37.5:
            alarms.append(f"Temperature out of range: {reading.temperature_c}°C")

        if not 7.0 <= reading.ph <= 7.4:
            alarms.append(f"pH out of range: {reading.ph}")

        if reading.dissolved_oxygen_percent < 30:
            alarms.append(f"Low DO: {reading.dissolved_oxygen_percent}%")

        if reading.viability_percent < 85:
            alarms.append(f"Low viability: {reading.viability_percent}%")

        return alarms
```

## Best Practices

### Bioinformatics Workflows

1. **Reproducibility**
   - Use workflow management systems (Nextflow, Snakemake, CWL)
   - Version control for pipelines and scripts
   - Container-based execution (Docker, Singularity)
   - Document software versions and parameters

2. **Data Quality Control**
   - FastQC for raw data assessment
   - MultiQC for aggregated QC reports
   - Remove PCR duplicates
   - Base quality score recalibration

3. **Reference Data Management**
   - Use standardized reference genomes (GRCh38, mm10)
   - Version tracking for reference assemblies
   - Consistent annotation databases

### Laboratory Automation

1. **Sample Tracking**
   - Unique barcode identifiers
   - Chain of custody documentation
   - Automated plate tracking
   - Integration with LIMS

2. **Quality Management**
   - Standard operating procedures (SOPs)
   - Quality control samples
   - Calibration and maintenance schedules
   - Deviation management

## Anti-Patterns

1. **Poor Data Management**
   - No backup strategy for sequencing data
   - Inconsistent file naming conventions
   - Missing metadata and sample annotations

2. **Inadequate QC**
   - Skipping quality control steps
   - Proceeding with low-quality samples
   - No validation of bioinformatics results

3. **Manual Processes**
   - Manual data transcription (error-prone)
   - Lack of automation for repetitive tasks
   - No integration between systems

4. **Insufficient Documentation**
   - Missing protocol versioning
   - Undocumented pipeline parameters
   - No electronic lab notebook records

## Resources

### Bioinformatics Tools

- **GATK**: https://gatk.broadinstitute.org (Genome Analysis Toolkit)
- **BWA**: http://bio-bwa.sourceforge.net (Alignment)
- **SAMtools/BCFtools**: http://www.htslib.org
- **Nextflow**: https://www.nextflow.io (Workflow management)

### Databases

- **NCBI GenBank**: https://www.ncbi.nlm.nih.gov/genbank
- **Ensembl**: https://www.ensembl.org
- **UniProt**: https://www.uniprot.org (Protein sequences)
- **dbSNP**: Database of genetic variation

### Standards

- **FASTQ**: Sequence data format standard
- **SAM/BAM**: Sequence Alignment/Map format
- **VCF**: Variant Call Format
- **CRAM**: Compressed alignment format
