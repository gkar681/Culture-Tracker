import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { VictoryAxis, VictoryChart, VictoryLine, VictoryScatter, VictoryTheme } from 'victory-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { VoiceInputButton } from '@/components/voice-input';

type ExperimentCellLineRow = {
  role: string | null;
  cell_line_id: string;
  cell_lines: {
    id: string;
    name: string;
    organism: string | null;
    tissue_type: string | null;
    morphology: string | null;
  } | null;
};

function normalizeWhitespace(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

function parseIsoDateFromText(text: string) {
  const m = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  return m ? m[0] : null;
}

function parseSplitRatio(text: string) {
  const m = text.match(/\b(\d+)\s*[:\/]\s*(\d+)\b/);
  return m ? `${m[1]}:${m[2]}` : null;
}

function parseConfluence(text: string) {
  const m = text.match(/\b(\d{1,3})(?:\s*%|\s*percent)?\s*(?:confluence|confluent)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

function parsePassageNumber(text: string) {
  // P12 / passage 12
  const m = text.match(/\b(?:p|passage)\s*#?\s*(\d+)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function parseFlaskType(text: string) {
  const m =
    text.match(/\b(t-\s*\d+)\b/i) ||
    text.match(/\b(\d+\s*-\s*well|\d+\s*well)\b/i) ||
    text.match(/\b(flask\s*[a-z0-9-]+)\b/i);
  return m ? normalizeWhitespace(m[1]).toUpperCase().replace(/\s+/g, '') : null;
}

function parseMedia(text: string) {
  // Prefer explicit "media: X" style.
  const m = text.match(/\bmedia\s*[:\-]\s*([a-z0-9+ ./_-]{2,40})/i);
  if (m) return normalizeWhitespace(m[1]);

  // Common media names (best-effort).
  const common = ['DMEM', 'RPMI', 'DMEM/F12', 'IMDM', 'MEM', 'DMEM F12'];
  for (const c of common) {
    if (text.toUpperCase().includes(c.replace(' ', ''))) return c.replace(' ', '');
  }
  return null;
}

function parseDose(text: string) {
  const m = text.match(
    /\b(\d+(?:\.\d+)?)\s*(uM|µM|mM|nM|pM|ng\/mL|ug\/mL|µg\/mL|mg\/mL)\b/i,
  );
  return m ? `${m[1]} ${m[2]}`.replace('uM', 'µM').replace('ug', 'µg') : null;
}

function parseExposureHours(text: string) {
  const m = text.match(/\b(?:for|duration|exposure)\s*(\d+(?:\.\d+)?)\s*(h|hr|hrs|hours)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function parseConditions(text: string) {
  const parts: string[] = [];
  if (/\b37\s*°?\s*c\b/i.test(text)) parts.push('37°C');
  if (/\b5\s*%?\s*(co2|co₂)\b/i.test(text)) parts.push('5% CO₂');
  if (/\b\d+\s*%?\s*(co2|co₂)\b/i.test(text) && !parts.includes('5% CO₂')) {
    const m = text.match(/\b(\d+)\s*%?\s*(co2|co₂)\b/i);
    if (m) parts.push(`${m[1]}% CO₂`);
  }
  return parts.length ? parts.join(', ') : null;
}

function parseCountInputs(text: string) {
  const t = text;
  const raw =
    t.match(/\braw\s*count\s*[:\-]?\s*(\d+)\b/i) ||
    t.match(/\bcount\s*[:\-]?\s*(\d+)\b/i);
  const dilution =
    t.match(/\b(?:dilution|diluted)\s*(?:factor)?\s*[:\-]?\s*(\d+(?:\.\d+)?)\b/i) ||
    t.match(/\bdf\s*[:\-]?\s*(\d+(?:\.\d+)?)\b/i);
  const vol =
    t.match(/\b(?:volume\s*counted|counted\s*volume|volume)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:u?l|µl)\b/i) ||
    t.match(/\b(\d+(?:\.\d+)?)\s*(?:u?l|µl)\s*(?:counted)\b/i);
  const viable = t.match(/\b(\d+(?:\.\d+)?)\s*%?\s*(?:viable|viability)\b/i);
  const cultureVol = t.match(/\b(?:culture|total)\s*volume\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*ml\b/i);

  const parseNum = (m: RegExpMatchArray | null) => (m ? Number(m[1]) : null);

  return {
    rawCount: raw ? Number(raw[1]) : null,
    dilutionFactor: parseNum(dilution),
    volumeCountedUl: parseNum(vol),
    viablePercent: parseNum(viable),
    cultureVolumeMl: parseNum(cultureVol),
  };
}

function parseTreatmentName(text: string) {
  // "treated with doxorubicin 10 uM" => doxorubicin
  const m = text.match(/\b(?:treated\s+with|treat(?:ment)?\s*[:\-]?)\s*([a-z0-9 _-]{2,40})/i);
  if (!m) return null;
  // stop at dose if present
  const candidate = m[1].split(/\b\d/)[0];
  return normalizeWhitespace(candidate);
}

function isoToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  // avoid NaN
  return Number.isFinite(n) ? n : null;
}

export default function ExperimentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const experimentId = id ?? null;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: experiment } = useQuery({
    queryKey: ['experiment', experimentId],
    enabled: !!experimentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experiments')
        .select('id, name, description, status, start_date, end_date')
        .eq('id', experimentId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: experimentCellLines } = useQuery({
    queryKey: ['experiment_cell_lines', experimentId],
    enabled: !!experimentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experiment_cell_lines')
        .select('role, cell_line_id, cell_lines(id, name, organism, tissue_type, morphology)')
        .eq('experiment_id', experimentId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ExperimentCellLineRow[];
    },
  });

  const cellLineOptions = useMemo(() => {
    return (experimentCellLines ?? [])
      .map((row) => ({
        id: row.cell_line_id,
        name: row.cell_lines?.name ?? 'Unknown',
        organism: row.cell_lines?.organism ?? null,
        tissue_type: row.cell_lines?.tissue_type ?? null,
        morphology: row.cell_lines?.morphology ?? null,
        role: row.role ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [experimentCellLines]);

  // -------- Graph selector + series data
  const [graphCellLineId, setGraphCellLineId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<
    'graphs' | 'passages' | 'observations' | 'counts' | 'treatments' | 'images'
  >('graphs');

  useEffect(() => {
    if (!graphCellLineId && cellLineOptions.length > 0) {
      setGraphCellLineId(cellLineOptions[0].id);
    }
  }, [cellLineOptions, graphCellLineId]);

  // -------- Passages form state
  const [passageCellLineId, setPassageCellLineId] = useState<string | null>(null);
  const [passageDate, setPassageDate] = useState<string>(isoToday());
  const [passageNumber, setPassageNumber] = useState<string>('');
  const [confluenceAtPassage, setConfluenceAtPassage] = useState<string>('');
  const [splitRatio, setSplitRatio] = useState<string>('');
  const [flaskType, setFlaskType] = useState<string>('');
  const [mediaUsed, setMediaUsed] = useState<string>('');
  const [passageNotes, setPassageNotes] = useState<string>('');
  const applyPassageParse = () => {
    const text = passageNotes;
    if (!text.trim()) return;

    const date = parseIsoDateFromText(text);
    const pn = parsePassageNumber(text);
    const conf = parseConfluence(text);
    const split = parseSplitRatio(text);
    const flask = parseFlaskType(text);
    const media = parseMedia(text);

    if (!passageDate.trim() && date) setPassageDate(date);
    if (!passageNumber.trim() && pn != null) setPassageNumber(String(pn));
    if (!confluenceAtPassage.trim() && conf != null) setConfluenceAtPassage(String(conf));
    if (!splitRatio.trim() && split) setSplitRatio(split);
    if (!flaskType.trim() && flask) setFlaskType(flask);
    if (!mediaUsed.trim() && media) setMediaUsed(media);
  };

  useEffect(() => {
    if (!passageCellLineId && cellLineOptions.length > 0) {
      setPassageCellLineId(cellLineOptions[0].id);
    }
  }, [cellLineOptions, passageCellLineId]);

  const { data: passages } = useQuery({
    queryKey: ['experiment_passages', experimentId],
    enabled: !!experimentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experiment_passages')
        .select(
          'id, cell_line_id, passage_number, passage_date, confluence_at_passage, split_ratio, flask_type, media_used, notes, cell_lines(name)'
        )
        .eq('experiment_id', experimentId)
        .order('passage_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createPassage = async () => {
    if (!experimentId || !passageCellLineId) return;
    if (!passageDate.trim()) return;

    const payload = {
      experiment_id: experimentId,
      cell_line_id: passageCellLineId,
      passage_number: passageNumber.trim() ? Number(passageNumber) : null,
      passage_date: passageDate,
      confluence_at_passage: confluenceAtPassage.trim() ? Number(confluenceAtPassage) : null,
      split_ratio: splitRatio.trim() || null,
      flask_type: flaskType.trim() || null,
      media_used: mediaUsed.trim() || null,
      notes: passageNotes.trim() || null,
    };

    const { error } = await supabase.from('experiment_passages').insert(payload);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['experiment_passages', experimentId] });
    setPassageNumber('');
    setConfluenceAtPassage('');
    setSplitRatio('');
    setFlaskType('');
    setMediaUsed('');
    setPassageNotes('');
    setPassageDate(isoToday());
  };

  // -------- Observations form state
  const [observationCellLineId, setObservationCellLineId] = useState<string | null>(null);
  const [morphologyObs, setMorphologyObs] = useState('');
  const [confluenceObs, setConfluenceObs] = useState('');
  const [contaminationCheck, setContaminationCheck] = useState('');
  const [observationNotes, setObservationNotes] = useState('');

  useEffect(() => {
    if (!observationCellLineId && cellLineOptions.length > 0) {
      setObservationCellLineId(cellLineOptions[0].id);
    }
  }, [cellLineOptions, observationCellLineId]);

  const { data: observations } = useQuery({
    queryKey: ['experiment_observations', experimentId],
    enabled: !!experimentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experiment_observations')
        .select(
          'id, recorded_at, morphology, confluence, contamination_check, notes, cell_lines(name)'
        )
        .eq('experiment_id', experimentId)
        .order('recorded_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createObservation = async () => {
    if (!experimentId || !observationCellLineId) return;
    const payload = {
      experiment_id: experimentId,
      cell_line_id: observationCellLineId,
      morphology: morphologyObs.trim() || null,
      confluence: confluenceObs.trim() ? Number(confluenceObs) : null,
      contamination_check: contaminationCheck.trim() || null,
      notes: observationNotes.trim() || null,
    };
    const { error } = await supabase.from('experiment_observations').insert(payload);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['experiment_observations', experimentId] });
    setMorphologyObs('');
    setConfluenceObs('');
    setContaminationCheck('');
    setObservationNotes('');
  };

  // -------- Cell counts form state
  const [countCellLineId, setCountCellLineId] = useState<string | null>(null);
  const [rawCount, setRawCount] = useState('');
  const [dilutionFactor, setDilutionFactor] = useState('');
  const [volumeCountedUl, setVolumeCountedUl] = useState('');
  const [viablePercent, setViablePercent] = useState('');
  const [cultureVolumeMl, setCultureVolumeMl] = useState('');
  const [countNotes, setCountNotes] = useState('');
  const applyCountParse = () => {
    const text = countNotes;
    if (!text.trim()) return;
    const parsed = parseCountInputs(text);
    if (!rawCount.trim() && parsed.rawCount != null) setRawCount(String(parsed.rawCount));
    if (!dilutionFactor.trim() && parsed.dilutionFactor != null) setDilutionFactor(String(parsed.dilutionFactor));
    if (!volumeCountedUl.trim() && parsed.volumeCountedUl != null) setVolumeCountedUl(String(parsed.volumeCountedUl));
    if (!viablePercent.trim() && parsed.viablePercent != null) setViablePercent(String(parsed.viablePercent));
    if (!cultureVolumeMl.trim() && parsed.cultureVolumeMl != null) setCultureVolumeMl(String(parsed.cultureVolumeMl));
  };

  useEffect(() => {
    if (!countCellLineId && cellLineOptions.length > 0) setCountCellLineId(cellLineOptions[0].id);
  }, [cellLineOptions, countCellLineId]);

  const computedCounts = useMemo(() => {
    const rc = parseOptionalNumber(rawCount);
    const df = parseOptionalNumber(dilutionFactor);
    const vol = parseOptionalNumber(volumeCountedUl);
    const vp = viablePercent.trim() ? parseOptionalNumber(viablePercent) : null;

    if (rc == null || df == null || vol == null || vol <= 0) return { cellsPerMl: null, totalCells: null };

    const viabilityMultiplier = vp == null ? 1 : vp / 100;
    const cellsPerMl = (rc * df * 1000) / vol * viabilityMultiplier;

    const cv = cultureVolumeMl.trim() ? parseOptionalNumber(cultureVolumeMl) : null;
    const totalCells = cv == null ? null : cellsPerMl * cv;

    return { cellsPerMl, totalCells };
  }, [rawCount, dilutionFactor, volumeCountedUl, viablePercent, cultureVolumeMl]);

  const { data: counts } = useQuery({
    queryKey: ['experiment_cell_counts', experimentId],
    enabled: !!experimentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experiment_cell_counts')
        .select(
          'id, cell_line_id, recorded_at, raw_count, dilution_factor, volume_counted_ul, viable_percent, calculated_cells_per_ml, calculated_total_cells, notes, cell_lines(name)'
        )
        .eq('experiment_id', experimentId)
        .order('recorded_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createCellCount = async () => {
    if (!experimentId || !countCellLineId) return;

    const payload = {
      experiment_id: experimentId,
      cell_line_id: countCellLineId,
      raw_count: rawCount.trim() ? Number(rawCount) : null,
      dilution_factor: dilutionFactor.trim() ? Number(dilutionFactor) : null,
      volume_counted_ul: volumeCountedUl.trim() ? Number(volumeCountedUl) : null,
      viable_percent: viablePercent.trim() ? Number(viablePercent) : null,
      calculated_cells_per_ml: computedCounts.cellsPerMl ?? null,
      calculated_total_cells: computedCounts.totalCells ?? null,
      notes: countNotes.trim() || null,
    };

    const { error } = await supabase.from('experiment_cell_counts').insert(payload);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['experiment_cell_counts', experimentId] });

    setRawCount('');
    setDilutionFactor('');
    setVolumeCountedUl('');
    setViablePercent('');
    setCultureVolumeMl('');
    setCountNotes('');
  };

  // -------- Treatments form state
  const [treatmentCellLineId, setTreatmentCellLineId] = useState<string | null>(null);
  const [treatmentName, setTreatmentName] = useState('');
  const [treatmentDose, setTreatmentDose] = useState('');
  const [treatmentExposureHours, setTreatmentExposureHours] = useState('');
  const [treatmentConditions, setTreatmentConditions] = useState('');
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const applyTreatmentParse = () => {
    const text = treatmentNotes;
    if (!text.trim()) return;
    const name = parseTreatmentName(text);
    const dose = parseDose(text);
    const hrs = parseExposureHours(text);
    const cond = parseConditions(text);
    if (!treatmentName.trim() && name) setTreatmentName(name);
    if (!treatmentDose.trim() && dose) setTreatmentDose(dose);
    if (!treatmentExposureHours.trim() && hrs != null) setTreatmentExposureHours(String(hrs));
    if (!treatmentConditions.trim() && cond) setTreatmentConditions(cond);
  };

  useEffect(() => {
    if (!treatmentCellLineId && cellLineOptions.length > 0) setTreatmentCellLineId(cellLineOptions[0].id);
  }, [cellLineOptions, treatmentCellLineId]);

  const { data: treatments } = useQuery({
    queryKey: ['experiment_treatments', experimentId],
    enabled: !!experimentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experiment_treatments')
        .select(
          'id, cell_line_id, applied_at, name, dose, exposure_duration_hours, conditions, notes, cell_lines(name)'
        )
        .eq('experiment_id', experimentId)
        .order('applied_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createTreatment = async () => {
    if (!experimentId || !treatmentCellLineId) return;
    if (!treatmentName.trim() && !treatmentDose.trim()) return;

    const payload = {
      experiment_id: experimentId,
      cell_line_id: treatmentCellLineId,
      name: treatmentName.trim() || null,
      dose: treatmentDose.trim() || null,
      exposure_duration_hours: treatmentExposureHours.trim() ? Number(treatmentExposureHours) : null,
      conditions: treatmentConditions.trim() || null,
      notes: treatmentNotes.trim() || null,
    };

    const { error } = await supabase.from('experiment_treatments').insert(payload);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['experiment_treatments', experimentId] });
    setTreatmentName('');
    setTreatmentDose('');
    setTreatmentExposureHours('');
    setTreatmentConditions('');
    setTreatmentNotes('');
  };

  // -------- Images form state + list
  const [imageCellLineId, setImageCellLineId] = useState<string | null>(null);
  const [imageMagnification, setImageMagnification] = useState('');
  const [imageNotes, setImageNotes] = useState('');

  useEffect(() => {
    if (!imageCellLineId && cellLineOptions.length > 0) setImageCellLineId(cellLineOptions[0].id);
  }, [cellLineOptions, imageCellLineId]);

  const { data: images } = useQuery({
    queryKey: ['experiment_images', experimentId],
    enabled: !!experimentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experiment_images')
        .select('id, storage_path, mime_type, taken_at, magnification, notes, cell_lines(name)')
        .eq('experiment_id', experimentId)
        .order('taken_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const uploadImage = async () => {
    if (!experimentId || !imageCellLineId) return;
    if (!user) return;

    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const mimeType = asset.mimeType ?? 'application/octet-stream';
    const response = await fetch(uri);
    const blob = await response.blob();
    const ext = asset.name?.split('.').pop() ?? (mimeType === 'application/pdf' ? 'pdf' : 'jpg');

    const storagePath = `${user.id}/${experimentId}/${imageCellLineId}/${Date.now()}.${ext}`;

    // Upload first to storage, then insert metadata in DB.
    const { error: uploadError } = await supabase.storage
      .from('experiment_images')
      .upload(storagePath, blob, { contentType: mimeType });

    if (uploadError) throw uploadError;

    const { error: insertError } = await supabase.from('experiment_images').insert({
      experiment_id: experimentId,
      cell_line_id: imageCellLineId,
      storage_path: storagePath,
      mime_type: mimeType,
      magnification: imageMagnification.trim() || null,
      notes: imageNotes.trim() || null,
    });

    if (insertError) throw insertError;

    await queryClient.invalidateQueries({ queryKey: ['experiment_images', experimentId] });
    setImageMagnification('');
    setImageNotes('');
  };

  const confluenceSeries = useMemo(() => {
    if (!graphCellLineId || !passages) return [];
    return (passages as any[])
      .filter((p) => p.cell_line_id === graphCellLineId && p.confluence_at_passage != null)
      .map((p) => ({
        x: new Date(p.passage_date),
        y: Number(p.confluence_at_passage),
        label: p.passage_date,
      }))
      .filter((pt) => Number.isFinite(pt.y));
  }, [graphCellLineId, passages]);

  const cellCountSeries = useMemo(() => {
    if (!graphCellLineId || !counts) return [];
    return (counts as any[])
      .filter((c) => c.cell_line_id === graphCellLineId && c.calculated_cells_per_ml != null)
      .map((c) => ({
        x: new Date(c.recorded_at),
        y: Number(c.calculated_cells_per_ml),
      }))
      .filter((pt) => Number.isFinite(pt.y));
  }, [graphCellLineId, counts]);

  const viabilitySeries = useMemo(() => {
    if (!graphCellLineId || !counts) return [];
    return (counts as any[])
      .filter((c) => c.cell_line_id === graphCellLineId && c.viable_percent != null)
      .map((c) => ({
        x: new Date(c.recorded_at),
        y: Number(c.viable_percent),
      }))
      .filter((pt) => Number.isFinite(pt.y));
  }, [graphCellLineId, counts]);

  const maxConfluence = useMemo(() => {
    return confluenceSeries.reduce((acc, p) => Math.max(acc, p.y), 0);
  }, [confluenceSeries]);

  const maxCellCount = useMemo(() => {
    return cellCountSeries.reduce((acc, p) => Math.max(acc, p.y), 0);
  }, [cellCountSeries]);

  const treatmentMarkersForCellLine = useMemo(() => {
    if (!graphCellLineId || !treatments) return { confluence: [], cells: [] };
    const points = (treatments as any[])
      .filter((t) => t.cell_line_id === graphCellLineId)
      .map((t) => ({
        x: new Date(t.applied_at),
        // y is filled by the caller (different charts want different y tops)
        name: t.name ?? 'Treatment',
      }))
      .filter((p) => p.x instanceof Date && !Number.isNaN(p.x.getTime()));

    return {
      confluence: points.map((p) => ({ x: p.x, y: maxConfluence * 1.05, label: p.name })),
      cells: points.map((p) => ({ x: p.x, y: maxCellCount * 1.05, label: p.name })),
    };
  }, [graphCellLineId, treatments, maxConfluence, maxCellCount]);

  const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <ThemedView style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </ThemedView>
  );

  const CellLinePick = ({
    selectedId,
    onPick,
  }: {
    selectedId: string | null;
    onPick: (id: string) => void;
  }) => (
    <View style={styles.pickGrid}>
      {cellLineOptions.map((cl) => {
        const selected = cl.id === selectedId;
        return (
          <TouchableOpacity
            key={cl.id}
            style={[styles.pickItem, selected && styles.pickItemSelected]}
            onPress={() => onPick(cl.id)}>
            <ThemedText type="defaultSemiBold" style={styles.pickItemText}>
              {cl.name}
            </ThemedText>
            {cl.role ? <ThemedText style={styles.pickRoleText}>{cl.role}</ThemedText> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText type="defaultSemiBold">{'‹ Back'}</ThemedText>
        </TouchableOpacity>

        <ThemedText type="title" style={styles.title}>
          {experiment?.name ?? 'Experiment'}
        </ThemedText>
        {experiment?.description ? <ThemedText>{experiment.description}</ThemedText> : null}
        <ThemedText>
          Status: {experiment?.status ?? 'planned'}
          {experiment?.start_date ? ` • Start: ${experiment.start_date}` : ''}
        </ThemedText>

        <View style={styles.sectionTabs}>
          {[
            ['graphs', 'Graphs'],
            ['passages', 'Passages'],
            ['observations', 'Observations'],
            ['counts', 'Counts'],
            ['treatments', 'Treatments'],
            ['images', 'Images'],
          ].map(([id, label]) => {
            const selected = activeSection === id;
            return (
              <TouchableOpacity
                key={id}
                style={[styles.sectionTab, selected && styles.sectionTabActive]}
                onPress={() =>
                  setActiveSection(
                    id as 'graphs' | 'passages' | 'observations' | 'counts' | 'treatments' | 'images'
                  )
                }>
                <ThemedText style={selected ? styles.sectionTabTextActive : undefined}>{label}</ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeSection === 'graphs' ? (
          <Section title="Typical graphs (auto-updating)">
          <ThemedText>Cell line</ThemedText>
          <CellLinePick selectedId={graphCellLineId} onPick={setGraphCellLineId} />

          <ThemedText style={styles.graphLabel}>Confluence % (from passages)</ThemedText>
          <View style={styles.chart}>
            {confluenceSeries.length > 0 ? (
              <VictoryChart theme={VictoryTheme.material} height={200}>
                <VictoryAxis
                  fixLabelOverlap
                  style={{ tickLabels: { fontSize: 10, padding: 3 } }}
                  tickFormat={(t) => {
                    const d = new Date(t as any);
                    // show MM-DD
                    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  }}
                />
                <VictoryAxis dependentAxis tickFormat={(t) => `${t}`} />
                <VictoryLine
                  data={confluenceSeries}
                  x="x"
                  y="y"
                  style={{ data: { strokeWidth: 2 } }}
                />
                <VictoryScatter
                  data={confluenceSeries}
                  x="x"
                  y="y"
                  size={4}
                  style={{ data: { fill: '#1f77b4' } }}
                />
                {treatmentMarkersForCellLine.confluence.length > 0 ? (
                  <VictoryScatter
                    data={treatmentMarkersForCellLine.confluence}
                    x="x"
                    y="y"
                    size={5}
                    style={{ data: { fill: '#d62728' } }}
                  />
                ) : null}
              </VictoryChart>
            ) : (
              <ThemedText style={styles.muted}>Log passages to see the confluence trend.</ThemedText>
            )}
          </View>

          <ThemedText style={styles.graphLabel}>Cells/mL (from cell counts)</ThemedText>
          <View style={styles.chart}>
            {cellCountSeries.length > 0 ? (
              <VictoryChart theme={VictoryTheme.material} height={200}>
                <VictoryAxis
                  fixLabelOverlap
                  style={{ tickLabels: { fontSize: 10, padding: 3 } }}
                  tickFormat={(t) => {
                    const d = new Date(t as any);
                    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  }}
                />
                <VictoryAxis dependentAxis tickFormat={(t) => `${t}`} />
                <VictoryLine
                  data={cellCountSeries}
                  x="x"
                  y="y"
                  style={{ data: { strokeWidth: 2 } }}
                />
                <VictoryScatter
                  data={cellCountSeries}
                  x="x"
                  y="y"
                  size={4}
                  style={{ data: { fill: '#ff7f0e' } }}
                />
                {treatmentMarkersForCellLine.cells.length > 0 ? (
                  <VictoryScatter
                    data={treatmentMarkersForCellLine.cells}
                    x="x"
                    y="y"
                    size={5}
                    style={{ data: { fill: '#d62728' } }}
                  />
                ) : null}
              </VictoryChart>
            ) : (
              <ThemedText style={styles.muted}>Log cell counts to see cells/mL over time.</ThemedText>
            )}
          </View>

          <ThemedText style={styles.graphLabel}>Viability % (from cell counts)</ThemedText>
          <View style={styles.chart}>
            {viabilitySeries.length > 0 ? (
              <VictoryChart theme={VictoryTheme.material} height={200} domain={{ y: [0, 100] }}>
                <VictoryAxis
                  fixLabelOverlap
                  style={{ tickLabels: { fontSize: 10, padding: 3 } }}
                  tickFormat={(t) => {
                    const d = new Date(t as any);
                    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  }}
                />
                <VictoryAxis dependentAxis tickFormat={(t) => `${t}`} />
                <VictoryLine
                  data={viabilitySeries}
                  x="x"
                  y="y"
                  style={{ data: { strokeWidth: 2 } }}
                />
                <VictoryScatter
                  data={viabilitySeries}
                  x="x"
                  y="y"
                  size={4}
                  style={{ data: { fill: '#2ca02c' } }}
                />
              </VictoryChart>
            ) : (
              <ThemedText style={styles.muted}>Log cell counts with viable % to see viability over time.</ThemedText>
            )}
          </View>
          </Section>
        ) : null}

        {activeSection === 'passages' ? (
          <Section title="Passages">
          <CellLinePick selectedId={passageCellLineId} onPick={setPassageCellLineId} />

          <TextInput style={styles.input} value={passageDate} onChangeText={setPassageDate} placeholder="YYYY-MM-DD" />
          <TextInput style={styles.input} value={passageNumber} onChangeText={setPassageNumber} placeholder="Passage number (optional)" keyboardType="numeric" />
          <TextInput style={styles.input} value={confluenceAtPassage} onChangeText={setConfluenceAtPassage} placeholder="Confluence % (optional)" keyboardType="numeric" />
          <TextInput style={styles.input} value={splitRatio} onChangeText={setSplitRatio} placeholder="Split ratio (e.g. 1:10)" />
          <TextInput style={styles.input} value={flaskType} onChangeText={setFlaskType} placeholder="Flask type (e.g. T-75)" />
          <TextInput style={styles.input} value={mediaUsed} onChangeText={setMediaUsed} placeholder="Media used" />
          <TextInput
            style={[styles.input, styles.multiline]}
            value={passageNotes}
            onChangeText={setPassageNotes}
            placeholder="Notes"
            multiline
            numberOfLines={3}
          />
          <View style={styles.inlineActions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={applyPassageParse}>
              <ThemedText type="defaultSemiBold">Parse notes → fields</ThemedText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={createPassage}>
            <ThemedText type="defaultSemiBold">{'Add passage'}</ThemedText>
          </TouchableOpacity>

          {passages?.length ? (
            passages.map((p: any) => (
              <View key={p.id} style={styles.row}>
                <ThemedText type="defaultSemiBold">{p.cell_lines?.name ?? 'Cell'}</ThemedText>
                <ThemedText>
                  {p.passage_date}
                  {p.passage_number != null ? ` • P${p.passage_number}` : ''}
                  {p.confluence_at_passage != null ? ` • ${p.confluence_at_passage}%` : ''}
                </ThemedText>
                {p.split_ratio ? <ThemedText>{`Split: ${p.split_ratio}`}</ThemedText> : null}
              </View>
            ))
          ) : (
            <ThemedText style={styles.muted}>No passages yet.</ThemedText>
          )}
          </Section>
        ) : null}

        {activeSection === 'observations' ? (
          <Section title="Observations">
          <CellLinePick selectedId={observationCellLineId} onPick={setObservationCellLineId} />
          <TextInput style={styles.input} value={morphologyObs} onChangeText={setMorphologyObs} placeholder="Morphology (e.g. healthy, stressed)" />
          <TextInput style={styles.input} value={confluenceObs} onChangeText={setConfluenceObs} placeholder="Confluence % (optional)" keyboardType="numeric" />
          <TextInput style={styles.input} value={contaminationCheck} onChangeText={setContaminationCheck} placeholder="Contamination check" />
          <TextInput
            style={[styles.input, styles.multiline]}
            value={observationNotes}
            onChangeText={setObservationNotes}
            placeholder="Notes"
            multiline
            numberOfLines={3}
          />
            <VoiceInputButton value={observationNotes} onChangeText={setObservationNotes} />

          <TouchableOpacity style={styles.primaryBtn} onPress={createObservation}>
            <ThemedText type="defaultSemiBold">{'Add observation'}</ThemedText>
          </TouchableOpacity>

          {observations?.length ? (
            observations.map((o: any) => (
              <View key={o.id} style={styles.row}>
                <ThemedText type="defaultSemiBold">{o.cell_lines?.name ?? 'Cell'}</ThemedText>
                <ThemedText>
                  {new Date(o.recorded_at).toLocaleString()}
                  {o.confluence != null ? ` • ${o.confluence}%` : ''}
                </ThemedText>
                {o.morphology ? <ThemedText>{o.morphology}</ThemedText> : null}
              </View>
            ))
          ) : (
            <ThemedText style={styles.muted}>No observations yet.</ThemedText>
          )}
          </Section>
        ) : null}

        {activeSection === 'counts' ? (
          <Section title="Cell counts & calculations">
          <CellLinePick selectedId={countCellLineId} onPick={setCountCellLineId} />
          <TextInput style={styles.input} value={rawCount} onChangeText={setRawCount} placeholder="Raw cell count (integer)" keyboardType="numeric" />
          <TextInput style={styles.input} value={dilutionFactor} onChangeText={setDilutionFactor} placeholder="Dilution factor" keyboardType="numeric" />
          <TextInput style={styles.input} value={volumeCountedUl} onChangeText={setVolumeCountedUl} placeholder="Volume counted (ul)" keyboardType="numeric" />
          <TextInput style={styles.input} value={viablePercent} onChangeText={setViablePercent} placeholder="Viable % (optional)" keyboardType="numeric" />
          <TextInput style={styles.input} value={cultureVolumeMl} onChangeText={setCultureVolumeMl} placeholder="Culture volume ML (optional for total cells)" keyboardType="numeric" />
          <TextInput
            style={[styles.input, styles.multiline]}
            value={countNotes}
            onChangeText={setCountNotes}
            placeholder="Notes"
            multiline
            numberOfLines={3}
          />
            <VoiceInputButton value={countNotes} onChangeText={setCountNotes} />
          <View style={styles.inlineActions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={applyCountParse}>
              <ThemedText type="defaultSemiBold">Parse notes → fields</ThemedText>
            </TouchableOpacity>
          </View>

          <ThemedText>
            {computedCounts.cellsPerMl != null
              ? `Calculated: ${computedCounts.cellsPerMl.toFixed(2)} cells/mL`
              : 'Calculated: cells/mL — enter required inputs'}
          </ThemedText>
          {computedCounts.totalCells != null ? (
            <ThemedText>{`Total cells: ${computedCounts.totalCells.toFixed(0)}`}</ThemedText>
          ) : null}

          <TouchableOpacity style={styles.primaryBtn} onPress={createCellCount}>
            <ThemedText type="defaultSemiBold">{'Add cell count'}</ThemedText>
          </TouchableOpacity>

          {counts?.length ? (
            counts.map((c: any) => (
              <View key={c.id} style={styles.row}>
                <ThemedText type="defaultSemiBold">{c.cell_lines?.name ?? 'Cell'}</ThemedText>
                <ThemedText>{new Date(c.recorded_at).toLocaleString()}</ThemedText>
                {c.calculated_cells_per_ml != null ? (
                  <ThemedText>{`cells/mL: ${Number(c.calculated_cells_per_ml).toFixed(2)}`}</ThemedText>
                ) : null}
              </View>
            ))
          ) : (
            <ThemedText style={styles.muted}>No counts yet.</ThemedText>
          )}
          </Section>
        ) : null}

        {activeSection === 'treatments' ? (
          <Section title="Treatments">
          <CellLinePick selectedId={treatmentCellLineId} onPick={setTreatmentCellLineId} />
          <TextInput style={styles.input} value={treatmentName} onChangeText={setTreatmentName} placeholder="Treatment / drug name" />
          <TextInput style={styles.input} value={treatmentDose} onChangeText={setTreatmentDose} placeholder="Dose (e.g. 10 uM)" />
          <TextInput style={styles.input} value={treatmentExposureHours} onChangeText={setTreatmentExposureHours} placeholder="Exposure duration (hours)" keyboardType="numeric" />
          <TextInput style={styles.input} value={treatmentConditions} onChangeText={setTreatmentConditions} placeholder="Conditions (e.g. 37C, CO2)" />
          <TextInput
            style={[styles.input, styles.multiline]}
            value={treatmentNotes}
            onChangeText={setTreatmentNotes}
            placeholder="Notes"
            multiline
            numberOfLines={3}
          />
            <VoiceInputButton value={treatmentNotes} onChangeText={setTreatmentNotes} />
          <View style={styles.inlineActions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={applyTreatmentParse}>
              <ThemedText type="defaultSemiBold">Parse notes → fields</ThemedText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={createTreatment}>
            <ThemedText type="defaultSemiBold">{'Add treatment'}</ThemedText>
          </TouchableOpacity>

          {treatments?.length ? (
            treatments.map((t: any) => (
              <View key={t.id} style={styles.row}>
                <ThemedText type="defaultSemiBold">{t.cell_lines?.name ?? 'Cell'}</ThemedText>
                <ThemedText>{new Date(t.applied_at).toLocaleString()}</ThemedText>
                {t.name ? <ThemedText>{t.name}</ThemedText> : null}
                {t.dose ? <ThemedText>{t.dose}</ThemedText> : null}
              </View>
            ))
          ) : (
            <ThemedText style={styles.muted}>No treatments yet.</ThemedText>
          )}
          </Section>
        ) : null}

        {activeSection === 'images' ? (
          <Section title="Images">
          <CellLinePick selectedId={imageCellLineId} onPick={setImageCellLineId} />
          <TextInput style={styles.input} value={imageMagnification} onChangeText={setImageMagnification} placeholder="Magnification (optional, e.g. 10x)" />
          <TextInput
            style={[styles.input, styles.multiline]}
            value={imageNotes}
            onChangeText={setImageNotes}
            placeholder="Notes (optional)"
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={uploadImage}>
            <ThemedText type="defaultSemiBold">{'Attach image / PDF'}</ThemedText>
          </TouchableOpacity>

          {images?.length ? (
            images.map((img: any) => (
              <TouchableOpacity
                key={img.id}
                style={styles.rowLink}
                onPress={async () => {
                  const { data } = await supabase.storage
                    .from('experiment_images')
                    .createSignedUrl(img.storage_path, 60 * 10);
                  if (data?.signedUrl) Linking.openURL(data.signedUrl);
                }}>
                <ThemedText type="defaultSemiBold">
                  {img.mime_type === 'application/pdf' ? 'PDF' : 'Image'} • {new Date(img.taken_at).toLocaleDateString()}
                </ThemedText>
                {img.cell_lines?.name ? <ThemedText>{img.cell_lines.name}</ThemedText> : null}
                {img.magnification ? <ThemedText>{img.magnification}</ThemedText> : null}
              </TouchableOpacity>
            ))
          ) : (
            <ThemedText style={styles.muted}>No images yet.</ThemedText>
          )}
          </Section>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  content: { gap: 16, paddingBottom: 40 },
  title: { marginTop: 6 },
  muted: { color: '#888' },
  section: { gap: 8, marginTop: 4 },
  sectionTitle: { marginTop: 6 },
  graphLabel: { marginTop: 6 },
  chart: { borderRadius: 12, borderWidth: 1, padding: 8, marginTop: 4, overflow: 'hidden' },
  sectionTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  sectionTab: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sectionTabActive: {
    borderWidth: 2,
  },
  sectionTabTextActive: {
    fontWeight: '600',
  },
  pickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickItem: { borderRadius: 12, borderWidth: 1, padding: 10, minWidth: '48%' },
  pickItemSelected: { borderWidth: 2 },
  pickItemText: { flexShrink: 1 },
  pickRoleText: { fontSize: 12, marginTop: 2, color: '#666' },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  primaryBtn: { marginTop: 6, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1 },
  inlineActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  secondaryBtn: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, alignItems: 'center' },
  row: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  rowLink: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
});

