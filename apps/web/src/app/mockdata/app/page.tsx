"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Users,
  Settings,
  Mic,
  Upload,
  Square,
  Volume2,
  Copy,
  Trash2,
  Play,
  Pause,
  ArrowLeft,
  Bell,
  Sparkles,
  Circle,
  Check,
  Plus,
  Send,
  ChevronRight,
  LayoutDashboard,
  Download,
  Edit3,
  Search,
  Building,
  AlertTriangle,
  Clock,
  TrendingUp,
  BarChart3,
  UserPlus,
  ArrowUpDown,
  Grid3X3,
  List,
  LogOut,
  Mail,
} from "lucide-react";
import styles from "../mockdata.module.css";
import {
  STUDENTS as STUDENTS_DATA,
  TRANSCRIPT,
  SIDEBAR_RECORDS as SIDEBAR_RECORDS_DATA,
  PROCESSING_STEPS,
  NOTIFICATIONS as NOTIFICATIONS_DATA,
  TOTAL_AUDIO_SECONDS,
  DASHBOARD_STATS,
  DASHBOARD_RECENT,
  DASHBOARD_WEEKLY_CHART,
  DASHBOARD_ALERTS,
  SUBJECT_FILTERS,
  SORT_OPTIONS,
  getAiResponse,
  type Notification,
  type SidebarRecord,
} from "./_data/mock-data";

/* ── Tag Style Map ── */

const TAG_STYLE_MAP: Record<string, string> = {
  tagMath: styles.tagMath,
  tagEng: styles.tagEng,
  tagKor: styles.tagKor,
  tagSci: styles.tagSci,
};

/* ── Types ── */

type ActiveTab = "records" | "students" | "dashboard" | "settings";
type RecordPhase = "empty" | "recording" | "processing" | "result";
type StudentPhase = "list" | "detail";
type ModalState =
  | null
  | { type: "deleteRecord"; recordId: string }
  | { type: "deleteStudent"; studentId: string }
  | { type: "addStudent" }
  | { type: "editStudent"; studentId: string }
  | { type: "logout" }
  | { type: "deleteAccount" }
  | { type: "addMemo"; studentId: string };

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

/* ── Helpers ── */

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatAudioTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const WAVE_BAR_COUNT = 24;

const AI_QUICK_CHIPS = ["요약 정리해줘", "후속 조치 목록", "보호자 안내 문자", "이전 상담과 비교", "추천 학습 루틴"];

/* ── Component ── */

export default function InteractiveAppPage() {
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>("records");
  const [viewKey, setViewKey] = useState(0);

  // Records
  const [recordPhase, setRecordPhase] = useState<RecordPhase>("empty");
  const [recSeconds, setRecSeconds] = useState(0);
  const [activeRecordId, setActiveRecordId] = useState<string>("rec1");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "user", text: "보호자 안내 문자 초안 만들어줘" },
    { role: "assistant", text: "[연세학원] 김민수 학생 상담 안내\n\n안녕하세요. 오늘 민수와 수학 과제 제출 관련 상담을 진행했습니다.\n\n학원 일정이 빡빡해 과제 시간 확보가 어려운 상황이라, 제출 기한을 익일 오전으로 조정했습니다. 2주간 적용 후 다시 점검하겠습니다.\n\n문의사항은 편하게 연락주세요." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [showSegments, setShowSegments] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [editingField, setEditingField] = useState<null | "title" | "studentName" | "type">(null);
  const [editValues, setEditValues] = useState({ title: "수학 과제 누락 상담", studentName: "김민수", type: "대면 상담" });
  const [sidebarSearch, setSidebarSearch] = useState("");

  // Students
  const [studentPhase, setStudentPhase] = useState<StudentPhase>("list");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [activeYear, setActiveYear] = useState("2026");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "recent" | "count">("name");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [studentDetailTab, setStudentDetailTab] = useState<"history" | "memos">("history");

  // Modals
  const [modal, setModal] = useState<ModalState>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Student form
  const [formName, setFormName] = useState("");
  const [formGrade, setFormGrade] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formSchool, setFormSchool] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formMemo, setFormMemo] = useState("");

  // Settings
  const [settingsNotifAll, setSettingsNotifAll] = useState(true);
  const [settingsNotifTranscript, setSettingsNotifTranscript] = useState(true);
  const [settingsNotifWeekly, setSettingsNotifWeekly] = useState(false);
  const [settingsRecordQuality, setSettingsRecordQuality] = useState<"high" | "medium" | "low">("high");
  const [settingsAiModel, setSettingsAiModel] = useState<"gpt-5.4-medium" | "gpt-4o-mini">("gpt-5.4-medium");
  const [settingsAutoSummary, setSettingsAutoSummary] = useState(true);

  // Notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(() => NOTIFICATIONS_DATA.map((n) => ({ ...n })));

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(true);

  // Dropdowns
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // Student detail chat
  const [detailChatMessages, setDetailChatMessages] = useState<ChatMessage[]>([]);
  const [detailChatInput, setDetailChatInput] = useState("");
  const [isDetailTyping, setIsDetailTyping] = useState(false);

  // Mutable records
  const [sidebarRecords, setSidebarRecords] = useState<SidebarRecord[]>(() => SIDEBAR_RECORDS_DATA.map((r) => ({ ...r })));

  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const detailChatRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const segmentIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  // Outside click for dropdowns
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Cleanup all timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (detailTypingTimeoutRef.current) clearTimeout(detailTypingTimeoutRef.current);
      if (segmentIntervalRef.current) clearInterval(segmentIntervalRef.current);
      processingTimeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatMessagesRef.current) chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
  }, [chatMessages, isTyping]);

  useEffect(() => {
    if (detailChatRef.current) detailChatRef.current.scrollTop = detailChatRef.current.scrollHeight;
  }, [detailChatMessages, isDetailTyping]);

  // Segment reveal on result
  useEffect(() => {
    if (recordPhase === "result") {
      setShowSegments(0);
      segmentIntervalRef.current = setInterval(() => {
        setShowSegments((prev) => {
          if (prev >= TRANSCRIPT.length) {
            if (segmentIntervalRef.current) clearInterval(segmentIntervalRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, 150);
      return () => {
        if (segmentIntervalRef.current) clearInterval(segmentIntervalRef.current);
      };
    }
    setShowSegments(0);
  }, [recordPhase, activeRecordId]);

  // Keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "r") {
        e.preventDefault();
        if (recordPhase === "empty" && activeTab === "records") startRecording();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [recordPhase, activeTab, startRecording]);

  // Onboarding shows once
  useEffect(() => {
    const t = setTimeout(() => {}, 0);
    return () => clearTimeout(t);
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  /* ── Recording actions ── */

  function startRecording() {
    setRecSeconds(0);
    setRecordPhase("recording");
    setViewKey((k) => k + 1);
    timerRef.current = setInterval(() => setRecSeconds((prev) => prev + 1), 1000);
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecordPhase("processing");
    setProcessingStep(0);
    setViewKey((k) => k + 1);
    startProcessingSteps();
  }

  function startProcessingSteps() {
    processingTimeoutsRef.current.forEach(clearTimeout);
    processingTimeoutsRef.current = [];
    PROCESSING_STEPS.forEach((step, i) => {
      const t = setTimeout(() => setProcessingStep(i + 1), step.completeAt);
      processingTimeoutsRef.current.push(t);
    });
    const finalT = setTimeout(() => {
      setRecordPhase("result");
      setActiveRecordId("rec1");
      setViewKey((k) => k + 1);
    }, 3500);
    processingTimeoutsRef.current.push(finalT);
  }

  function handleFileUpload() { fileInputRef.current?.click(); }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    showToast(`"${file.name}" 업로드 중...`);
    setTimeout(() => {
      setRecordPhase("processing");
      setProcessingStep(0);
      setViewKey((k) => k + 1);
      startProcessingSteps();
    }, 500);
    e.target.value = "";
  }

  function newRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    processingTimeoutsRef.current.forEach(clearTimeout);
    processingTimeoutsRef.current = [];
    if (audioIntervalRef.current) { clearInterval(audioIntervalRef.current); audioIntervalRef.current = null; }
    setRecordPhase("empty");
    setRecSeconds(0);
    setProcessingStep(0);
    setIsPlaying(false);
    setAudioProgress(0);
    setViewKey((k) => k + 1);
  }

  /* ── Audio player ── */

  function togglePlay() {
    if (isPlaying) {
      setIsPlaying(false);
      if (audioIntervalRef.current) { clearInterval(audioIntervalRef.current); audioIntervalRef.current = null; }
    } else {
      setIsPlaying(true);
      audioIntervalRef.current = setInterval(() => {
        setAudioProgress((prev) => {
          const next = prev + 100 / (TOTAL_AUDIO_SECONDS * 10);
          if (next >= 100) {
            setIsPlaying(false);
            if (audioIntervalRef.current) { clearInterval(audioIntervalRef.current); audioIntervalRef.current = null; }
            return 100;
          }
          return next;
        });
      }, 100);
    }
  }

  function handleTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setAudioProgress(Math.max(0, Math.min(100, pct)));
  }

  /* ── Chat actions ── */

  function sendChatMessage(text: string) {
    if (!text.trim()) return;
    setChatMessages((prev) => [...prev, { role: "user", text: text.trim() }]);
    setChatInput("");
    setIsTyping(true);
    typingTimeoutRef.current = setTimeout(() => {
      setChatMessages((prev) => [...prev, { role: "assistant", text: getAiResponse(text) }]);
      setIsTyping(false);
    }, 1500);
  }

  function handleChatKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); sendChatMessage(chatInput); }
  }

  function sendDetailChat(text: string) {
    if (!text.trim()) return;
    setDetailChatMessages((prev) => [...prev, { role: "user", text: text.trim() }]);
    setDetailChatInput("");
    setIsDetailTyping(true);
    detailTypingTimeoutRef.current = setTimeout(() => {
      setDetailChatMessages((prev) => [...prev, { role: "assistant", text: getAiResponse(text) }]);
      setIsDetailTyping(false);
    }, 1500);
  }

  function handleDetailChatKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); sendDetailChat(detailChatInput); }
  }

  /* ── Student actions ── */

  function selectStudent(id: string) {
    setSelectedStudentId(id);
    setStudentPhase("detail");
    setStudentDetailTab("history");
    setDetailChatMessages([]);
    setViewKey((k) => k + 1);
  }

  function backToStudentList() {
    setStudentPhase("list");
    setViewKey((k) => k + 1);
  }

  /* ── Inline editing ── */

  function startEditing(field: "title" | "studentName" | "type") {
    setEditingField(field);
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>, _field: "title" | "studentName" | "type") {
    if (e.key === "Enter") { setEditingField(null); showToast("수정되었습니다"); }
    if (e.key === "Escape") { setEditingField(null); }
  }

  /* ── Modal helpers ── */

  function openStudentForm(studentId?: string) {
    if (studentId) {
      const s = STUDENTS_DATA.find((st) => st.id === studentId);
      if (s) {
        setFormName(s.name);
        setFormGrade(s.grade);
        setFormTags(s.tags.map((t) => t.cls));
        setFormSchool(s.school ?? "");
        setFormPhone(s.phone ?? "");
        setFormMemo("");
        setModal({ type: "editStudent", studentId });
      }
    } else {
      setFormName("");
      setFormGrade("");
      setFormTags([]);
      setFormSchool("");
      setFormPhone("");
      setFormMemo("");
      setModal({ type: "addStudent" });
    }
  }

  function toggleFormTag(cls: string) {
    setFormTags((prev) => prev.includes(cls) ? prev.filter((t) => t !== cls) : [...prev, cls]);
  }

  /* ── Derived data ── */

  const selectedStudent = STUDENTS_DATA.find((s) => s.id === selectedStudentId);
  const activeRecord = sidebarRecords.find((r) => r.id === activeRecordId);
  const currentAudioTime = (audioProgress / 100) * TOTAL_AUDIO_SECONDS;

  const filteredSidebarRecords = sidebarSearch
    ? sidebarRecords.filter((r) => r.title.includes(sidebarSearch) || r.studentName.includes(sidebarSearch))
    : sidebarRecords;

  let filteredStudents = STUDENTS_DATA.filter((s) => {
    if (studentSearch && !s.name.includes(studentSearch)) return false;
    if (subjectFilter !== "all" && !s.tags.some((t) => t.cls === subjectFilter)) return false;
    return true;
  });

  if (sortBy === "name") filteredStudents = [...filteredStudents].sort((a, b) => a.name.localeCompare(b.name));
  else if (sortBy === "recent") filteredStudents = [...filteredStudents].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  else if (sortBy === "count") filteredStudents = [...filteredStudents].sort((a, b) => b.counseling - a.counseling);

  /* ── Dropdown style ── */

  const dropdownStyle: React.CSSProperties = {
    position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
    background: "var(--surface2)", border: "1px solid var(--border-light)", borderRadius: "var(--radius)",
    padding: "6px 0", minWidth: 200, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  };

  const dropdownItemStyle: React.CSSProperties = {
    padding: "8px 16px", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer",
    display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none",
    border: "none", textAlign: "left", fontFamily: "inherit",
  };

  /* ── Copy transcript ── */

  function copyTranscript() {
    const text = TRANSCRIPT.map((s) => `[${s.time}] ${s.label}: ${s.text}`).join("\n");
    navigator.clipboard.writeText(text).then(() => showToast("전사 원문이 클립보드에 복사되었습니다")).catch(() => showToast("전사 원문이 클립보드에 복사되었습니다"));
  }

  /* ── Render: Typing Indicator ── */

  function renderTypingIndicator() {
    return (
      <div className={styles.typingIndicator}>
        <div className={`${styles.typingDot} ${styles.typingDot1}`} />
        <div className={`${styles.typingDot} ${styles.typingDot2}`} />
        <div className={`${styles.typingDot} ${styles.typingDot3}`} />
      </div>
    );
  }

  /* ── Render: Toggle ── */

  function renderToggle(on: boolean, onChange: () => void) {
    return (
      <button className={`${styles.settingsToggle} ${on ? styles.settingsToggleOn : ""} ${styles.btnPress}`} onClick={onChange}>
        <div className={`${styles.settingsToggleKnob} ${on ? styles.settingsToggleKnobOn : ""}`} />
      </button>
    );
  }

  /* ── Render: GNav ── */

  function renderGnav() {
    return (
      <div className={styles.gnav}>
        <div
          className={`${styles.gnavItem} ${styles.btnPress} ${activeTab === "records" ? styles.gnavItemActive : ""}`}
          title="상담 기록"
          onClick={() => { setActiveTab("records"); setViewKey((k) => k + 1); }}
        >
          <FileText size={16} />
        </div>
        <div
          className={`${styles.gnavItem} ${styles.btnPress} ${activeTab === "students" ? styles.gnavItemActive : ""}`}
          title="학생 관리"
          onClick={() => { setActiveTab("students"); setViewKey((k) => k + 1); }}
        >
          <Users size={16} />
        </div>
        <div
          className={`${styles.gnavItem} ${styles.btnPress} ${activeTab === "dashboard" ? styles.gnavItemActive : ""}`}
          title="대시보드"
          onClick={() => { setActiveTab("dashboard"); setViewKey((k) => k + 1); }}
        >
          <LayoutDashboard size={16} />
        </div>
        <div
          className={`${styles.gnavItem} ${styles.btnPress} ${activeTab === "settings" ? styles.gnavItemActive : ""}`}
          title="설정"
          onClick={() => { setActiveTab("settings"); setViewKey((k) => k + 1); }}
        >
          <Settings size={16} />
        </div>

        <div className={styles.gnavSpacer} />

        {/* Notifications */}
        <div style={{ position: "relative" }} ref={notifRef}>
          <div
            className={`${styles.gnavItem} ${styles.btnPress}`}
            style={{ position: "relative" }}
            title="알림"
            onClick={() => { setShowNotifications((v) => !v); setShowProfileMenu(false); }}
          >
            <Bell size={16} />
            {unreadCount > 0 && <span className={styles.notifBadge} />}
          </div>
          {showNotifications && (
            <div className={styles.notifPanel}>
              <div className={styles.notifHeader}>
                <span>알림</span>
                <button
                  className={`${styles.notifMarkRead} ${styles.btnPress}`}
                  onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))}
                >
                  모두 읽음
                </button>
              </div>
              <div className={styles.notifList}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`${styles.notifItem} ${n.unread ? styles.notifItemUnread : ""}`}
                    onClick={() => {
                      setNotifications((prev) => prev.map((nn) => nn.id === n.id ? { ...nn, unread: false } : nn));
                      setShowNotifications(false);
                      showToast(n.title);
                    }}
                  >
                    <div className={styles.notifItemTitle}>{n.title}</div>
                    <div className={styles.notifItemTime}>{n.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div style={{ position: "relative" }} ref={profileRef}>
          <div
            className={styles.gnavAvatar}
            style={{ cursor: "pointer" }}
            onClick={() => { setShowProfileMenu((v) => !v); setShowNotifications(false); }}
          >
            최
          </div>
          {showProfileMenu && (
            <div style={dropdownStyle}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>연세학원</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>최원장 · 원장</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  <Mail size={10} /> wschoi809@naver.com
                </div>
              </div>
              <button
                style={dropdownItemStyle}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                onClick={() => { showToast("프로필이 수정되었습니다"); setShowProfileMenu(false); }}
              >
                <Edit3 size={14} /> 프로필 수정
              </button>
              <button
                style={{ ...dropdownItemStyle, color: "var(--red)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                onClick={() => { setModal({ type: "logout" }); setShowProfileMenu(false); }}
              >
                <LogOut size={14} /> 로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Render: Wave Visualizer ── */

  function renderWaveVisualizer() {
    return (
      <div className={styles.recWaveWrap}>
        {Array.from({ length: WAVE_BAR_COUNT }).map((_, i) => {
          const minH = 4;
          const maxH = 28;
          const baseH = minH + ((Math.sin(i * 0.7) + 1) / 2) * (maxH - minH);
          return (
            <div
              key={i}
              className={styles.recWaveBar}
              style={{
                height: baseH,
                animation: `mockVizBar 0.${4 + (i % 5)}s ease-in-out ${(i * 0.07).toFixed(2)}s infinite alternate`,
              }}
            />
          );
        })}
      </div>
    );
  }

  /* ── Render: Records Empty ── */

  function renderRecordsEmpty() {
    return (
      <div className={styles.flex1} key={viewKey}>
        <div className={`${styles.emptyState} ${styles.fadeIn}`}>
          <div className={`${styles.emptyIconWrap} ${styles.emptyIconFloat}`}>
            <Mic size={30} />
          </div>
          <p className={styles.emptyTitle}>상담을 녹음해 보세요</p>
          <p className={styles.emptyDesc}>
            녹음하면 AI가 자동으로 전사하고, 학생 이름 · 상담 요약까지 정리합니다.
          </p>
          <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 20 }}>
            또는 기존 음성 파일을 업로드할 수 있습니다
          </p>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <button className={`${styles.btnLg} ${styles.btnAccent} ${styles.btnPress}`} onClick={startRecording}>
              <Mic size={16} /> 녹음 시작
            </button>
            <button className={`${styles.btnLg} ${styles.btnOutline} ${styles.btnPress}`} onClick={handleFileUpload}>
              <Upload size={16} /> 파일 업로드
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-dim)" }}>
            <kbd style={{ padding: "2px 6px", background: "var(--surface3)", borderRadius: 4, border: "1px solid var(--border)", fontSize: 10 }}>⌘</kbd>
            {" + "}
            <kbd style={{ padding: "2px 6px", background: "var(--surface3)", borderRadius: 4, border: "1px solid var(--border)", fontSize: 10 }}>R</kbd>
            로 빠르게 녹음 시작
          </p>
        </div>
        <input ref={fileInputRef} type="file" accept="audio/*" className={styles.hiddenInput} onChange={onFileSelected} />
      </div>
    );
  }

  /* ── Render: Records Recording ── */

  function renderRecordsRecording() {
    return (
      <div className={styles.flex1} key={viewKey}>
        <div className={`${styles.emptyState} ${styles.fadeIn}`}>
          <div className={styles.emptyIconWrap} style={{ background: "var(--red-dim)", borderColor: "rgba(248,113,113,0.2)" }}>
            <Mic size={30} style={{ color: "var(--red)" }} />
          </div>
          <p className={styles.emptyTitle}>녹음 중입니다</p>
          {renderWaveVisualizer()}
          <div className={styles.recBar}>
            <div className={styles.recPulse} />
            <div style={{ flex: 1 }}>
              <p className={styles.recLabel}>녹음 중</p>
              <p className={styles.recTime}>{formatTime(recSeconds)} 경과</p>
            </div>
            <button className={`${styles.btnStop} ${styles.btnPress}`} onClick={stopRecording}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Square size={12} /> 녹음 종료
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Render: Processing Steps UI ── */

  function renderProcessingStepsUI() {
    return (
      <div className={styles.processSteps}>
        {PROCESSING_STEPS.map((step, i) => {
          const isDone = processingStep > i;
          const isActive = processingStep === i;
          const stepClass = [styles.processStep, isDone ? styles.processStepDone : "", isActive ? styles.processStepActive : ""].filter(Boolean).join(" ");
          const iconClass = [styles.processStepIcon, isDone ? styles.processStepIconDone : "", isActive ? styles.processStepIconActive : ""].filter(Boolean).join(" ");
          return (
            <div key={step.label} className={stepClass}>
              <div className={iconClass}>
                {isDone ? <Check size={12} /> : isActive ? <div className={styles.processStepSpinner} /> : <Circle size={8} />}
              </div>
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  /* ── Render: Records Processing ── */

  function renderRecordsProcessing() {
    return (
      <>
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>상담 기록 ({sidebarRecords.length})</span>
            <button className={`${styles.btnNew} ${styles.btnPress}`} onClick={newRecording}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Plus size={12} /> 새 녹음</span>
            </button>
          </div>
          <div className={styles.sidebarList}>
            <div className={`${styles.sidebarItem} ${styles.sidebarItemActive} ${styles.sidebarItemProcessing}`}>
              <div className={styles.sidebarItemTitle}>녹음 2026.04.08 03:46</div>
              <div className={styles.sidebarItemMeta}>
                <span className={`${styles.statusBadge} ${styles.statusProcessing}`}>
                  <Circle size={8} fill="currentColor" /> 전사 중
                </span>
                {recSeconds > 0 ? formatTime(recSeconds) : "2분 34초"}
              </div>
            </div>
          </div>
        </div>
        <div className={`${styles.center} ${styles.fadeIn}`} key={viewKey}>
          <div className={styles.centerHeader}>
            <div>
              <p className={styles.centerTitle}>녹음 2026.04.08 03:46</p>
              <p className={styles.centerMeta}>{recSeconds > 0 ? formatTime(recSeconds) : "2분 34초"} · 전사 처리 중</p>
            </div>
          </div>
          <div className={styles.processingState}>
            <div className={styles.spinner} />
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>음성을 분석하고 있습니다</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>보통 1~2분 이내 완료</p>
            {renderProcessingStepsUI()}
          </div>
        </div>
        <div className={styles.aiPanel}>
          <div className={styles.aiHeader}>
            <span className={`${styles.aiHeaderDot} ${styles.aiHeaderDotAmber}`} />
            AI 어시스턴트
          </div>
          <div className={styles.aiMessages}>
            <div className={`${styles.aiMsg} ${styles.aiMsgSystem}`}>전사가 완료되면 자동으로<br />상담 요약을 생성합니다</div>
          </div>
          <div className={styles.aiInputWrap}>
            <input className={styles.aiInput} placeholder="전사 완료 후 질문 가능" disabled style={{ opacity: 0.5 }} />
          </div>
        </div>
      </>
    );
  }

  /* ── Render: Records Result ── */

  function renderRecordsResult() {
    return (
      <>
        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>상담 기록 ({sidebarRecords.length})</span>
            <button className={`${styles.btnNew} ${styles.btnPress}`} onClick={newRecording}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Plus size={12} /> 새 녹음</span>
            </button>
          </div>
          <input
            className={styles.sidebarSearch}
            placeholder="학생, 제목 검색..."
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
          />
          <div className={styles.sidebarList}>
            {filteredSidebarRecords.map((item) => (
              <div
                key={item.id}
                className={[
                  styles.sidebarItem,
                  item.id === activeRecordId ? styles.sidebarItemActive : "",
                  item.status === "processing" ? styles.sidebarItemProcessing : "",
                ].filter(Boolean).join(" ")}
                onClick={() => {
                  setActiveRecordId(item.id);
                  if (item.status === "ready") {
                    setEditValues({ title: item.title, studentName: item.studentName, type: item.type || "대면 상담" });
                  }
                }}
              >
                <div className={styles.sidebarItemTitle}>{item.title}</div>
                <div className={styles.sidebarItemMeta}>
                  <span className={`${styles.statusBadge} ${item.status === "ready" ? styles.statusReady : styles.statusProcessing}`}>
                    {item.status === "ready" ? <><Check size={10} /> 완료</> : <><Circle size={8} fill="currentColor" /> 전사 중</>}
                  </span>
                  {item.meta}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center */}
        <div className={`${styles.center} ${styles.fadeIn}`} key={`${viewKey}-${activeRecordId}`}>
          <div className={styles.centerHeader}>
            <div>
              <p className={styles.centerTitle}>
                {editingField === "title" ? (
                  <input
                    className={styles.inlineEdit}
                    value={editValues.title}
                    onChange={(e) => setEditValues((v) => ({ ...v, title: e.target.value }))}
                    onKeyDown={(e) => handleEditKeyDown(e, "title")}
                    onBlur={() => setEditingField(null)}
                    autoFocus
                  />
                ) : (
                  <span className={styles.editable} onClick={() => startEditing("title")}>{editValues.title}</span>
                )}
              </p>
              <p className={styles.centerMeta}>
                {editingField === "studentName" ? (
                  <input
                    className={styles.inlineEdit}
                    style={{ fontSize: 11 }}
                    value={editValues.studentName}
                    onChange={(e) => setEditValues((v) => ({ ...v, studentName: e.target.value }))}
                    onKeyDown={(e) => handleEditKeyDown(e, "studentName")}
                    onBlur={() => setEditingField(null)}
                    autoFocus
                  />
                ) : (
                  <span className={styles.editable} onClick={() => startEditing("studentName")}>{editValues.studentName}</span>
                )}
                {" · "}
                {editingField === "type" ? (
                  <input
                    className={styles.inlineEdit}
                    style={{ fontSize: 11 }}
                    value={editValues.type}
                    onChange={(e) => setEditValues((v) => ({ ...v, type: e.target.value }))}
                    onKeyDown={(e) => handleEditKeyDown(e, "type")}
                    onBlur={() => setEditingField(null)}
                    autoFocus
                  />
                ) : (
                  <span className={styles.editable} onClick={() => startEditing("type")}>{editValues.type}</span>
                )}
                {" · "}
                {activeRecord?.duration ?? "2분 34초"} · 원문 완료
              </p>
            </div>
            <div className={styles.centerActions}>
              <button className={`${styles.iconBtn} ${styles.btnPress}`} title="음성 재생" onClick={togglePlay}><Volume2 size={14} /></button>
              <button className={`${styles.iconBtn} ${styles.btnPress}`} title="복사" onClick={copyTranscript}><Copy size={14} /></button>
              <button
                className={`${styles.iconBtn} ${styles.iconRed} ${styles.btnPress}`}
                title="삭제"
                onClick={() => setModal({ type: "deleteRecord", recordId: activeRecordId })}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className={styles.centerBody}>
            {/* Audio player */}
            <div className={styles.audioPlayer}>
              <button className={`${styles.playBtn} ${styles.btnPress}`} onClick={togglePlay}>
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              </button>
              <span className={styles.audioTime}>{formatAudioTime(currentAudioTime)}</span>
              <div className={`${styles.audioTrack} ${styles.audioTrackInteractive}`} onClick={handleTrackClick}>
                <div className={styles.audioTrackFill} style={{ width: `${audioProgress}%` }} />
              </div>
              <span className={styles.audioTime}>{formatAudioTime(TOTAL_AUDIO_SECONDS)}</span>
            </div>

            {/* Transcript */}
            {TRANSCRIPT.slice(0, showSegments).map((seg, i) => (
              <div key={i} className={`${styles.segment} ${styles.segmentReveal}`} style={{ animationDelay: `${i * 0.05}s` }}>
                <span className={styles.segTime}>{seg.time}</span>
                <span className={`${styles.segSpeaker} ${seg.speaker === "teacher" ? styles.segTeacher : styles.segStudent}`}>{seg.label}</span>
                <span className={styles.segText}>{seg.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Panel */}
        <div className={styles.aiPanel}>
          <div className={styles.aiHeader}>
            <span className={styles.aiHeaderDot} />
            AI 어시스턴트
          </div>
          <div className={`${styles.aiSummary} ${styles.aiSummaryShimmer}`}>
            <div className={styles.aiSummaryBadge}><Sparkles size={12} /> AI 상담 요약</div>
            <div className={styles.aiKv}>
              <span className={styles.aiKvLabel}>핵심</span>
              <span className={styles.aiKvValue}>학원 일정 과밀로 과제 시간 부족</span>
            </div>
            <div className={styles.aiKv}>
              <span className={styles.aiKvLabel}>합의</span>
              <span className={styles.aiKvValue}>과제 제출 기한 익일 오전으로 조정</span>
            </div>
            <div className={styles.aiDivider} />
            <div className={styles.aiSummaryText}>
              학원 일정(주 5회)으로 인한 과제 시간 부족이 핵심 원인입니다. 과제 제출 기한을 익일 오전으로 조정하기로 합의했으며, 2주간 적용 후 학습 루틴을 재점검할 예정입니다.
            </div>
          </div>
          <div className={styles.aiMessages} ref={chatMessagesRef}>
            {chatMessages.map((msg, i) => (
              <div key={i} className={`${styles.aiMsg} ${msg.role === "user" ? styles.aiMsgUser : styles.aiMsgAssistant}`}>
                {msg.text.split("\n").map((line, j) => (
                  <span key={j}>{line}<br /></span>
                ))}
              </div>
            ))}
            {isTyping && renderTypingIndicator()}
          </div>
          <div className={styles.aiQuick}>
            {AI_QUICK_CHIPS.map((chip) => (
              <button key={chip} className={`${styles.aiChip} ${styles.btnPress}`} onClick={() => sendChatMessage(chip)}>
                {chip}
              </button>
            ))}
          </div>
          <div className={styles.aiInputWrap}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className={styles.aiInput}
                placeholder="AI에게 질문하기..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
              />
              <button
                className={`${styles.btnNew} ${styles.btnPress}`}
                style={{ padding: "8px 12px", flexShrink: 0 }}
                onClick={() => sendChatMessage(chatInput)}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── Render: Records Tab ── */

  function renderRecords() {
    if (recordPhase === "empty") return renderRecordsEmpty();
    if (recordPhase === "recording") return renderRecordsRecording();
    if (recordPhase === "processing") return renderRecordsProcessing();
    return renderRecordsResult();
  }

  /* ── Render: Students List ── */

  function renderStudentsList() {
    return (
      <div className={`${styles.flexCol} ${styles.fadeIn}`} key={viewKey}>
        <div className={styles.studentPageHeader}>
          <div>
            <div className={styles.studentPageHeaderTitle}>학생 관리</div>
            <div className={styles.studentPageHeaderSub}>{STUDENTS_DATA.length}명의 학생</div>
          </div>
          <div className={styles.studentHeaderActions}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
              <input
                className={styles.sidebarSearch}
                style={{ paddingLeft: 30, width: 200 }}
                placeholder="학생 검색..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>
            <button className={`${styles.btnNew} ${styles.btnPress}`} onClick={() => openStudentForm()}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><UserPlus size={12} /> 학생 추가</span>
            </button>
          </div>
        </div>

        {/* Year tabs */}
        <div className={styles.yearTabs}>
          {["2026", "2025", "2024", "전체"].map((y) => (
            <button
              key={y}
              className={`${styles.yearTab} ${activeYear === y ? styles.yearTabActive : ""} ${styles.btnPress}`}
              onClick={() => setActiveYear(y)}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className={styles.filterBar}>
          {SUBJECT_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`${styles.filterPill} ${subjectFilter === f.value ? styles.filterPillActive : ""} ${styles.btnPress}`}
              onClick={() => setSubjectFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
          <div className={styles.filterSep} />
          <button className={`${styles.sortBtn} ${styles.btnPress}`} onClick={() => {
            const opts: Array<"name" | "recent" | "count"> = ["name", "recent", "count"];
            const idx = opts.indexOf(sortBy);
            setSortBy(opts[(idx + 1) % opts.length]);
          }}>
            <ArrowUpDown size={12} />
            {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
          </button>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === "card" ? styles.viewToggleBtnActive : ""} ${styles.btnPress}`}
              onClick={() => setViewMode("card")}
            >
              <Grid3X3 size={14} />
            </button>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === "list" ? styles.viewToggleBtnActive : ""} ${styles.btnPress}`}
              onClick={() => setViewMode("list")}
            >
              <List size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        {viewMode === "card" ? (
          <div className={styles.studentGrid}>
            {filteredStudents.map((s) => (
              <div key={s.id} className={`${styles.studentCard} ${styles.btnPress}`} onClick={() => selectStudent(s.id)}>
                <div className={styles.studentCardHeader}>
                  <div className={styles.studentAvatar} style={{ background: s.gradient }}>{s.initial}</div>
                  <div>
                    <div className={styles.studentName}>{s.name}</div>
                    <div className={styles.studentSub}>
                      {s.grade} · {s.registered} 등록
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  {s.tags.map((tag) => (
                    <span key={tag.cls} className={`${styles.tagSm} ${TAG_STYLE_MAP[tag.cls] ?? ""}`}>{tag.label}</span>
                  ))}
                </div>
                <div className={styles.studentStats}>
                  <div>
                    <div className={styles.studentStatLabel}>총 상담</div>
                    <div className={styles.studentStatValue}>{s.counseling}</div>
                  </div>
                  <div>
                    <div className={styles.studentStatLabel}>이번 달</div>
                    <div className={styles.studentStatValue}>{s.thisMonth}</div>
                  </div>
                  <div>
                    <div className={styles.studentStatLabel}>마지막</div>
                    <div className={styles.studentStatValue}>{s.lastDate}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.studentListView}>
            {filteredStudents.map((s) => (
              <div key={s.id} className={`${styles.studentListRow} ${styles.btnPress}`} onClick={() => selectStudent(s.id)}>
                <div className={styles.studentListAvatar} style={{ background: s.gradient }}>{s.initial}</div>
                <div className={styles.studentListName}>{s.name}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {s.tags.map((tag) => (
                    <span key={tag.cls} className={`${styles.tagSm} ${TAG_STYLE_MAP[tag.cls] ?? ""}`}>{tag.label}</span>
                  ))}
                </div>
                <div className={styles.studentListMeta}>
                  <span>{s.grade}</span>
                  <span>상담 {s.counseling}회</span>
                  <span>마지막 {s.lastDate}</span>
                </div>
                <ChevronRight size={14} style={{ color: "var(--text-dim)" }} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Render: Student Detail ── */

  function renderStudentDetail() {
    if (!selectedStudent) return null;
    const s = selectedStudent;
    return (
      <div className={styles.flex1} key={viewKey}>
        <div className={`${styles.flexCol} ${styles.fadeIn}`} style={{ flex: 1 }}>
          {/* Breadcrumb */}
          <div className={styles.breadcrumb}>
            <span className={`${styles.breadcrumbLink} ${styles.btnPress}`} onClick={backToStudentList}>
              <ArrowLeft size={14} style={{ marginRight: 4 }} />
              학생 관리
            </span>
            <span className={styles.breadcrumbSep}><ChevronRight size={10} /></span>
            <span className={styles.breadcrumbCurrent}>{s.name}</span>
          </div>

          {/* Header */}
          <div className={styles.studentDetailHeader}>
            <div className={styles.studentDetailAvatar} style={{ background: s.gradient }}>{s.initial}</div>
            <div style={{ flex: 1 }}>
              <div className={styles.studentDetailName}>{s.name}</div>
              <div className={styles.studentDetailSub}>
                {s.tags.map((tag) => (
                  <span key={tag.cls} className={`${styles.tagSm} ${TAG_STYLE_MAP[tag.cls] ?? ""}`}>{tag.label}</span>
                ))}
                <span style={{ marginLeft: 4 }}>{s.grade} · {s.registered} 등록</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className={`${styles.iconBtn} ${styles.btnPress}`} title="수정" onClick={() => openStudentForm(s.id)}>
                <Edit3 size={14} />
              </button>
              <button
                className={`${styles.iconBtn} ${styles.iconRed} ${styles.btnPress}`}
                title="삭제"
                onClick={() => setModal({ type: "deleteStudent", studentId: s.id })}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.studentDetailStats}>
            <div>
              <div className={styles.sdsLabel}>총 상담</div>
              <div className={styles.sdsValue}>{s.counseling}<span className={styles.sdsUnit}>회</span></div>
            </div>
            <div>
              <div className={styles.sdsLabel}>이번 달</div>
              <div className={styles.sdsValue}>{s.thisMonth}<span className={styles.sdsUnit}>회</span></div>
            </div>
            <div>
              <div className={styles.sdsLabel}>마지막 상담</div>
              <div className={styles.sdsValue}>{s.lastDate}</div>
            </div>
            <div>
              <div className={styles.sdsLabel}>주요 이슈</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.mainIssue}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.yearTabs}>
            <button
              className={`${styles.yearTab} ${studentDetailTab === "history" ? styles.yearTabActive : ""} ${styles.btnPress}`}
              onClick={() => setStudentDetailTab("history")}
            >
              상담 이력
            </button>
            <button
              className={`${styles.yearTab} ${studentDetailTab === "memos" ? styles.yearTabActive : ""} ${styles.btnPress}`}
              onClick={() => setStudentDetailTab("memos")}
            >
              메모 ({s.memos.length})
            </button>
          </div>

          {/* Tab content */}
          {studentDetailTab === "history" ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>제목</th>
                    <th>유형</th>
                    <th>요약</th>
                  </tr>
                </thead>
                <tbody>
                  {s.history.map((h, i) => (
                    <tr
                      key={i}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setActiveTab("records");
                        setRecordPhase("result");
                        setActiveRecordId("rec1");
                        setViewKey((k) => k + 1);
                        showToast(`${s.name} · ${h.title} 기록으로 이동`);
                      }}
                    >
                      <td className={styles.tdMono}>{h.date}</td>
                      <td className={styles.tdBold}>{h.title}</td>
                      <td>{h.type}</td>
                      <td className={styles.tdTruncate}>{h.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.memoSection}>
              <button
                className={`${styles.btnNew} ${styles.btnPress}`}
                style={{ marginBottom: 12 }}
                onClick={() => setModal({ type: "addMemo", studentId: s.id })}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Plus size={12} /> 메모 추가</span>
              </button>
              {s.memos.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--text-dim)" }}>메모가 없습니다</div>
              )}
              {s.memos.map((m) => (
                <div key={m.id} className={styles.memoCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className={styles.memoDate}>{m.date}</div>
                    <button
                      className={`${styles.iconBtn} ${styles.btnPress}`}
                      style={{ width: 24, height: 24 }}
                      onClick={() => showToast("메모가 삭제되었습니다")}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className={styles.memoText}>{m.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Panel */}
        <div className={styles.aiPanel}>
          <div className={styles.aiHeader}>
            <span className={styles.aiHeaderDot} />
            AI 종합 분석
          </div>
          <div className={styles.aiSummary}>
            <div className={styles.aiSummaryBadge}><Sparkles size={12} /> {s.name} 종합 리포트</div>
            <div className={styles.aiSummaryText} dangerouslySetInnerHTML={{ __html: s.aiReport }} />
          </div>
          <div className={styles.aiMessages} ref={detailChatRef}>
            {detailChatMessages.length === 0 && (
              <div className={`${styles.aiMsg} ${styles.aiMsgSystem}`}>
                {s.name} 학생에 대해 질문해 보세요
              </div>
            )}
            {detailChatMessages.map((msg, i) => (
              <div key={i} className={`${styles.aiMsg} ${msg.role === "user" ? styles.aiMsgUser : styles.aiMsgAssistant}`}>
                {msg.text.split("\n").map((line, j) => (
                  <span key={j}>{line}<br /></span>
                ))}
              </div>
            ))}
            {isDetailTyping && renderTypingIndicator()}
          </div>
          <div className={styles.aiQuick}>
            {["학습 패턴 분석", "보호자 안내 문자", "후속 조치 목록", "추천 학습 루틴"].map((chip) => (
              <button key={chip} className={`${styles.aiChip} ${styles.btnPress}`} onClick={() => sendDetailChat(chip)}>
                {chip}
              </button>
            ))}
          </div>
          <div className={styles.aiInputWrap}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className={styles.aiInput}
                placeholder="AI에게 질문하기..."
                value={detailChatInput}
                onChange={(e) => setDetailChatInput(e.target.value)}
                onKeyDown={handleDetailChatKeyDown}
              />
              <button className={`${styles.btnNew} ${styles.btnPress}`} style={{ padding: "8px 12px", flexShrink: 0 }} onClick={() => sendDetailChat(detailChatInput)}>
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Render: Students Tab ── */

  function renderStudents() {
    if (studentPhase === "detail") return renderStudentDetail();
    return renderStudentsList();
  }

  /* ── Render: Dashboard Tab ── */

  function renderDashboard() {
    return (
      <div className={`${styles.dashPage} ${styles.fadeIn}`} key={viewKey}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, letterSpacing: -0.3 }}>대시보드</h2>

        {/* Stats cards */}
        <div className={styles.dashGrid}>
          <div className={styles.dashCard}>
            <div className={styles.dashCardLabel}><Clock size={12} /> 오늘 상담</div>
            <div className={styles.dashCardValue}>{DASHBOARD_STATS.todayCounseling}<span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-dim)" }}>건</span></div>
            <div className={styles.dashCardSub}><TrendingUp size={10} /> 어제 대비 +2</div>
          </div>
          <div className={styles.dashCard}>
            <div className={styles.dashCardLabel}><Users size={12} /> 전체 학생</div>
            <div className={styles.dashCardValue}>{DASHBOARD_STATS.totalStudents}<span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-dim)" }}>명</span></div>
          </div>
          <div className={styles.dashCard}>
            <div className={styles.dashCardLabel}><Mic size={12} /> 이번 주 녹음</div>
            <div className={styles.dashCardValue}>{DASHBOARD_STATS.weeklyRecordingHours}<span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-dim)" }}>시간</span></div>
          </div>
          <div className={styles.dashCard}>
            <div className={styles.dashCardLabel}><AlertTriangle size={12} /> 후속 조치 대기</div>
            <div className={styles.dashCardValue}>{DASHBOARD_STATS.pendingFollowUps}<span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-dim)" }}>건</span></div>
          </div>
        </div>

        {/* Weekly chart */}
        <div className={styles.dashSection}>
          <div className={styles.dashSectionTitle}><BarChart3 size={14} style={{ marginRight: 6 }} />주간 상담 현황</div>
          <div className={styles.dashBarChart}>
            {DASHBOARD_WEEKLY_CHART.map((d) => (
              <div key={d.day} className={styles.dashBar} style={{ height: `${d.value}%` }}>
                <div className={styles.dashBarLabel}>{d.day}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 28 }} />
        </div>

        {/* Recent counseling */}
        <div className={styles.dashSection}>
          <div className={styles.dashSectionTitle}>최근 상담</div>
          <div className={styles.dashRecentList}>
            {DASHBOARD_RECENT.map((item, i) => (
              <div
                key={i}
                className={`${styles.dashRecentItem} ${styles.btnPress}`}
                onClick={() => {
                  setActiveTab("records");
                  setRecordPhase("result");
                  setActiveRecordId("rec1");
                  setViewKey((k) => k + 1);
                  showToast(`${item.studentName} · ${item.title} 기록으로 이동`);
                }}
              >
                <div className={styles.dashRecentDot} style={{ background: item.color }} />
                <div className={styles.dashRecentTitle}>{item.studentName} · {item.title}</div>
                <div className={styles.dashRecentMeta}>{item.date}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Attention needed */}
        <div className={styles.dashSection}>
          <div className={styles.dashSectionTitle}><AlertTriangle size={14} style={{ marginRight: 6, color: "var(--amber)" }} />주의 필요 학생</div>
          {DASHBOARD_ALERTS.map((a, i) => (
            <div
              key={i}
              className={`${styles.dashAlertCard} ${styles.btnPress}`}
              onClick={() => {
                const student = STUDENTS_DATA.find((s) => s.name === a.studentName);
                if (student) {
                  setActiveTab("students");
                  selectStudent(student.id);
                }
              }}
            >
              <div className={styles.studentAvatar} style={{ background: a.gradient, width: 32, height: 32, fontSize: 12 }}>{a.initial}</div>
              <div>
                <div className={styles.dashAlertName}>{a.studentName}</div>
                <div className={styles.dashAlertReason}>{a.reason}</div>
              </div>
              <ChevronRight size={14} style={{ color: "var(--text-dim)", marginLeft: "auto" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Render: Settings Tab ── */

  function renderSettings() {
    return (
      <div className={`${styles.settingsPage} ${styles.fadeIn}`} key={viewKey}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, letterSpacing: -0.3 }}>설정</h2>

        {/* Academy info */}
        <div className={styles.settingsSection}>
          <div className={styles.settingsSectionTitle}><Building size={15} /> 학원 정보</div>
          <div className={styles.settingsRow}>
            <div><div className={styles.settingsRowLabel}>학원명</div></div>
            <div className={styles.settingsRowValue}>연세학원</div>
          </div>
          <div className={styles.settingsRow}>
            <div><div className={styles.settingsRowLabel}>전화번호</div></div>
            <div className={styles.settingsRowValue}>02-1234-5678</div>
          </div>
          <div className={styles.settingsRow}>
            <div><div className={styles.settingsRowLabel}>대표 이메일</div></div>
            <div className={styles.settingsRowValue}>wschoi809@naver.com</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className={`${styles.settingsBtn} ${styles.btnPress}`} onClick={() => showToast("학원 정보가 수정되었습니다")}>
              학원 정보 수정
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className={styles.settingsSection}>
          <div className={styles.settingsSectionTitle}><Bell size={15} /> 알림</div>
          <div className={styles.settingsRow}>
            <div>
              <div className={styles.settingsRowLabel}>전체 알림</div>
              <div className={styles.settingsRowDesc}>모든 알림을 받습니다</div>
            </div>
            {renderToggle(settingsNotifAll, () => setSettingsNotifAll((v) => !v))}
          </div>
          <div className={styles.settingsRow}>
            <div>
              <div className={styles.settingsRowLabel}>전사 완료 알림</div>
              <div className={styles.settingsRowDesc}>녹음 전사가 완료되면 알림</div>
            </div>
            {renderToggle(settingsNotifTranscript, () => setSettingsNotifTranscript((v) => !v))}
          </div>
          <div className={styles.settingsRow}>
            <div>
              <div className={styles.settingsRowLabel}>주간 리포트 알림</div>
              <div className={styles.settingsRowDesc}>매주 월요일 주간 리포트 알림</div>
            </div>
            {renderToggle(settingsNotifWeekly, () => setSettingsNotifWeekly((v) => !v))}
          </div>
        </div>

        {/* Recording settings */}
        <div className={styles.settingsSection}>
          <div className={styles.settingsSectionTitle}><Mic size={15} /> 녹음 설정</div>
          <div className={styles.settingsRow}>
            <div><div className={styles.settingsRowLabel}>녹음 품질</div></div>
            <select
              className={styles.settingsSelect}
              value={settingsRecordQuality}
              onChange={(e) => setSettingsRecordQuality(e.target.value as "high" | "medium" | "low")}
            >
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
          </div>
          <div className={styles.settingsRow}>
            <div>
              <div className={styles.settingsRowLabel}>자동 전사</div>
              <div className={styles.settingsRowDesc}>녹음 완료 후 자동으로 전사를 시작합니다</div>
            </div>
            {renderToggle(true, () => showToast("자동 전사 설정이 변경되었습니다"))}
          </div>
        </div>

        {/* AI settings */}
        <div className={styles.settingsSection}>
          <div className={styles.settingsSectionTitle}><Sparkles size={15} /> AI 설정</div>
          <div className={styles.settingsRow}>
            <div><div className={styles.settingsRowLabel}>AI 모델</div></div>
            <select
              className={styles.settingsSelect}
              value={settingsAiModel}
              onChange={(e) => setSettingsAiModel(e.target.value as "gpt-5.4-medium" | "gpt-4o-mini")}
            >
              <option value="gpt-5.4-medium">GPT-5.4 Medium</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
            </select>
          </div>
          <div className={styles.settingsRow}>
            <div>
              <div className={styles.settingsRowLabel}>자동 요약 생성</div>
              <div className={styles.settingsRowDesc}>전사 완료 후 AI 요약을 자동 생성합니다</div>
            </div>
            {renderToggle(settingsAutoSummary, () => setSettingsAutoSummary((v) => !v))}
          </div>
        </div>

        {/* Data */}
        <div className={styles.settingsSection}>
          <div className={styles.settingsSectionTitle}><Download size={15} /> 데이터</div>
          <div className={styles.settingsRow}>
            <div><div className={styles.settingsRowLabel}>상담 기록 내보내기</div></div>
            <button className={`${styles.settingsBtn} ${styles.btnPress}`} onClick={() => showToast("내보내기가 시작되었습니다")}>
              CSV 내보내기
            </button>
          </div>
          <div className={styles.settingsRow}>
            <div><div className={styles.settingsRowLabel}>전체 백업</div></div>
            <button className={`${styles.settingsBtn} ${styles.btnPress}`} onClick={() => showToast("백업 파일을 준비 중입니다")}>
              백업 다운로드
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className={styles.settingsDangerZone}>
          <div className={styles.settingsDangerTitle}>계정 삭제</div>
          <div className={styles.settingsDangerDesc}>
            계정을 삭제하면 모든 상담 기록, 학생 데이터, AI 분석 결과가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </div>
          <button
            className={`${styles.settingsBtn} ${styles.settingsBtnDanger} ${styles.btnPress}`}
            onClick={() => { setDeleteConfirmText(""); setModal({ type: "deleteAccount" }); }}
          >
            회원 탈퇴
          </button>
        </div>
      </div>
    );
  }

  /* ── Render: Modals ── */

  function renderModal() {
    if (!modal) return null;

    if (modal.type === "deleteRecord") {
      return (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>상담 기록 삭제</div>
            <div className={styles.modalDesc}>이 상담 기록을 삭제하시겠습니까?</div>
            <div className={styles.modalActions}>
              <button className={`${styles.modalBtn} ${styles.modalBtnCancel} ${styles.btnPress}`} onClick={() => setModal(null)}>취소</button>
              <button className={`${styles.modalBtn} ${styles.modalBtnDanger} ${styles.btnPress}`} onClick={() => {
                setSidebarRecords((prev) => prev.filter((r) => r.id !== modal.recordId));
                setModal(null);
                newRecording();
                showToast("상담 기록이 삭제되었습니다");
              }}>삭제</button>
            </div>
          </div>
        </div>
      );
    }

    if (modal.type === "deleteStudent") {
      const student = STUDENTS_DATA.find((s) => s.id === modal.studentId);
      return (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>학생 삭제</div>
            <div className={styles.modalDesc}>
              {student?.name ?? ""} 학생을 삭제하시겠습니까? 이 학생의 모든 상담 기록도 함께 삭제됩니다.
            </div>
            <div className={styles.modalActions}>
              <button className={`${styles.modalBtn} ${styles.modalBtnCancel} ${styles.btnPress}`} onClick={() => setModal(null)}>취소</button>
              <button className={`${styles.modalBtn} ${styles.modalBtnDanger} ${styles.btnPress}`} onClick={() => {
                setModal(null);
                backToStudentList();
                showToast(`${student?.name ?? "학생"}이(가) 삭제되었습니다`);
              }}>삭제</button>
            </div>
          </div>
        </div>
      );
    }

    if (modal.type === "addStudent" || modal.type === "editStudent") {
      const isEdit = modal.type === "editStudent";
      return (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>{isEdit ? "학생 정보 수정" : "학생 추가"}</div>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.modalLabel}>이름</label>
                <input className={styles.modalInput} placeholder="학생 이름" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.modalLabel}>학년</label>
                <input className={styles.modalInput} placeholder="예: 중2" value={formGrade} onChange={(e) => setFormGrade(e.target.value)} />
              </div>
            </div>
            <label className={styles.modalLabel}>과목</label>
            <div className={styles.formTagGroup}>
              {[{ label: "수학", cls: "tagMath" }, { label: "영어", cls: "tagEng" }, { label: "국어", cls: "tagKor" }, { label: "과학", cls: "tagSci" }].map((t) => (
                <button
                  key={t.cls}
                  className={`${styles.formTag} ${formTags.includes(t.cls) ? styles.formTagSelected : ""} ${styles.btnPress}`}
                  onClick={() => toggleFormTag(t.cls)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.modalLabel}>학교</label>
                <input className={styles.modalInput} placeholder="학교명" value={formSchool} onChange={(e) => setFormSchool(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.modalLabel}>연락처</label>
                <input className={styles.modalInput} placeholder="010-0000-0000" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
              </div>
            </div>
            <label className={styles.modalLabel}>메모</label>
            <textarea className={styles.formTextarea} placeholder="메모 (선택)" value={formMemo} onChange={(e) => setFormMemo(e.target.value)} />
            <div className={styles.modalActions} style={{ marginTop: 16 }}>
              <button className={`${styles.modalBtn} ${styles.modalBtnCancel} ${styles.btnPress}`} onClick={() => setModal(null)}>취소</button>
              <button className={`${styles.modalBtn} ${styles.modalBtnPrimary} ${styles.btnPress}`} onClick={() => {
                setModal(null);
                showToast(isEdit ? "학생 정보가 수정되었습니다" : "학생이 추가되었습니다");
              }}>{isEdit ? "저장" : "추가"}</button>
            </div>
          </div>
        </div>
      );
    }

    if (modal.type === "logout") {
      return (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>로그아웃</div>
            <div className={styles.modalDesc}>로그아웃하시겠습니까?</div>
            <div className={styles.modalActions}>
              <button className={`${styles.modalBtn} ${styles.modalBtnCancel} ${styles.btnPress}`} onClick={() => setModal(null)}>취소</button>
              <button className={`${styles.modalBtn} ${styles.modalBtnPrimary} ${styles.btnPress}`} onClick={() => {
                setModal(null);
                showToast("로그아웃되었습니다");
              }}>로그아웃</button>
            </div>
          </div>
        </div>
      );
    }

    if (modal.type === "deleteAccount") {
      return (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>정말 탈퇴하시겠습니까?</div>
            <div className={styles.modalDesc}>
              모든 데이터가 영구 삭제됩니다. 계속하려면 아래에 &apos;연세학원&apos;을 입력해주세요.
            </div>
            <input
              className={styles.modalInput}
              placeholder="연세학원"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button className={`${styles.modalBtn} ${styles.modalBtnCancel} ${styles.btnPress}`} onClick={() => setModal(null)}>취소</button>
              <button
                className={`${styles.modalBtn} ${styles.modalBtnDanger} ${styles.btnPress}`}
                disabled={deleteConfirmText !== "연세학원"}
                style={{ opacity: deleteConfirmText !== "연세학원" ? 0.4 : 1, cursor: deleteConfirmText !== "연세학원" ? "not-allowed" : "pointer" }}
                onClick={() => {
                  if (deleteConfirmText === "연세학원") {
                    setModal(null);
                    showToast("탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.");
                  }
                }}
              >
                탈퇴
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (modal.type === "addMemo") {
      return (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>메모 추가</div>
            <label className={styles.modalLabel}>내용</label>
            <textarea className={styles.formTextarea} placeholder="메모 내용을 입력하세요" value={formMemo} onChange={(e) => setFormMemo(e.target.value)} />
            <div className={styles.modalActions} style={{ marginTop: 16 }}>
              <button className={`${styles.modalBtn} ${styles.modalBtnCancel} ${styles.btnPress}`} onClick={() => setModal(null)}>취소</button>
              <button className={`${styles.modalBtn} ${styles.modalBtnPrimary} ${styles.btnPress}`} onClick={() => {
                setModal(null);
                setFormMemo("");
                showToast("메모가 추가되었습니다");
              }}>추가</button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  /* ── Render: Onboarding ── */

  function renderOnboarding() {
    if (!showOnboarding) return null;
    return (
      <div className={styles.onboardOverlay}>
        <div className={styles.onboardCard}>
          <div className={styles.onboardTitle}>YEON에 오신 것을 환영합니다</div>
          <div className={styles.onboardDesc}>
            학원 상담을 녹음하면 AI가 자동으로 전사하고 요약합니다. 학생별로 상담 기록을 관리하고 인사이트를 얻어보세요.
          </div>
          <div className={styles.onboardSteps}>
            <div className={styles.onboardStep}>
              <div className={styles.onboardStepNum}>1</div>
              <div>
                <div style={{ fontWeight: 500 }}>녹음 시작</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>상담을 녹음하거나 음성 파일을 업로드하세요</div>
              </div>
            </div>
            <div className={styles.onboardStep}>
              <div className={styles.onboardStepNum}>2</div>
              <div>
                <div style={{ fontWeight: 500 }}>AI 자동 전사 & 요약</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>AI가 음성을 텍스트로 변환하고 핵심을 정리합니다</div>
              </div>
            </div>
            <div className={styles.onboardStep}>
              <div className={styles.onboardStepNum}>3</div>
              <div>
                <div style={{ fontWeight: 500 }}>학생별 관리</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>학생별 상담 이력과 AI 분석을 한눈에 확인하세요</div>
              </div>
            </div>
          </div>
          <button className={`${styles.btnLg} ${styles.btnAccent} ${styles.btnPress}`} onClick={() => setShowOnboarding(false)} style={{ width: "100%", justifyContent: "center" }}>
            시작하기
          </button>
        </div>
      </div>
    );
  }

  /* ── Main content routing ── */

  function renderContent() {
    switch (activeTab) {
      case "records": return renderRecords();
      case "students": return renderStudents();
      case "dashboard": return renderDashboard();
      case "settings": return renderSettings();
    }
  }

  /* ── Top Nav ── */

  const tabLabels: Record<ActiveTab, string> = {
    records: "상담 기록",
    students: "학생 관리",
    dashboard: "대시보드",
    settings: "설정",
  };

  return (
    <div className={styles.mockRoot}>
      {/* Top Navigation */}
      <div className={styles.topNav}>
        <span className={styles.logo}>YEON</span>
        <div className={styles.navTabs}>
          {(["records", "students", "dashboard", "settings"] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              className={`${styles.navTab} ${activeTab === tab ? styles.navTabActive : ""} ${styles.btnPress}`}
              onClick={() => { setActiveTab(tab); setViewKey((k) => k + 1); }}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
        <div className={styles.navSpacer} />
        <span className={styles.navMeta}>목업 서비스</span>
      </div>

      {/* App Shell */}
      <div className={styles.appShell}>
        {renderGnav()}
        {renderContent()}
      </div>

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Modal */}
      {renderModal()}

      {/* Onboarding */}
      {renderOnboarding()}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="audio/*" className={styles.hiddenInput} onChange={onFileSelected} />
    </div>
  );
}
