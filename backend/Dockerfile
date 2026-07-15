FROM python:3.11-slim-bookworm

ARG PEPTIDE_TOOLS_COMMIT=e639de3c08ee701a1ad9c25f70c6d26a7589af8c

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    MPLBACKEND=Agg \
    PEPTIDE_TOOLS_COMMIT=${PEPTIDE_TOOLS_COMMIT} \
    PYTHONPATH=/opt/peptide-tools/smi2scrambledfasta:/opt/peptide-tools/extn_coeff_fasta:/opt/peptide-tools/pIChemiSt:/opt/peptide-tools/liabilities:/opt/peptide-tools/molecular_descriptors:/opt/peptide-tools/peptide_tools_master

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        git \
        libxext6 \
        libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/peptide-tools-api
COPY backend/requirements.txt ./requirements.txt
RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir -r requirements.txt

RUN git clone https://github.com/AstraZeneca/peptide-tools.git /opt/peptide-tools \
    && git -C /opt/peptide-tools checkout "${PEPTIDE_TOOLS_COMMIT}" \
    && python -m pip install --no-cache-dir --no-deps /opt/peptide-tools/pIChemiSt \
    && rm -rf /opt/peptide-tools/.git

COPY backend/app ./app

RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /tmp/peptide-tools \
    && chown -R appuser:appuser /srv/peptide-tools-api /tmp/peptide-tools

USER appuser
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD python -c "import os, urllib.request; port=os.getenv('PORT', '8000'); urllib.request.urlopen(f'http://127.0.0.1:{port}/health', timeout=4)"

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port \"${PORT:-8000}\" --workers 1 --no-proxy-headers"]
