import React, { useState, useEffect, useRef } from "react";
import * as mammoth from "mammoth";
import { FilePlus, User, Check, Edit3, Play } from "lucide-react";

export default function App() {
  const [userRole, setUserRole] = useState(null);
  const [teacherName, setTeacherName] = useState("Guru");
  const [exams, setExams] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ujian_exams") || "[]"); } catch(e){ return []; }
  });
  const [currentExamId, setCurrentExamId] = useState(null);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("ujian_exams", JSON.stringify(exams));
  }, [exams]);

  function loginAs(role){ setUserRole(role); setMessage(""); }

  async function handleDocxUpload(e){
    const file = e.target.files[0];
    if (!file) return;
    setMessage("Memproses file...");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const raw = result.value;
      const parsed = parseQuestionsFromRawText(raw);
      if (parsed.questions.length === 0) {
        setMessage("Tidak menemukan soal. Pastikan format Word sesuai panduan di Dashboard Guru.");
        return;
      }
      const newExam = {
        id: Date.now().toString(),
        title: file.name.replace(/\.docx?$/i, ""),
        teacher: teacherName,
        questions: parsed.questions,
        timeLimitMinutes: parsed.timeLimitMinutes || 30,
        createdAt: new Date().toISOString(),
      };
      setExams(prev => [newExam, ...prev]);
      setMessage("Soal berhasil diunggah dan diparsing.");
      fileInputRef.current.value = "";
    } catch(err){
      console.error(err);
      setMessage("Gagal memproses file. Coba ulangi.");
    }
  }

  function parseQuestionsFromRawText(raw){
    const lines = raw.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>0);
    const questions = [];
    let i = 0;
    while (i < lines.length){
      const line = lines[i];
      if (line.toUpperCase().startsWith("Q:")){
        const qText = line.slice(2).trim();
        i++;
        const opts = {};
        let answer = null;
        let qtype = "MCQ";
        while (i < lines.length && !lines[i].toUpperCase().startsWith("Q:")){
          const ln = lines[i];
          const optMatch = ln.match(/^([A-D])\)\s*(.*)$/i);
          const answerMatch = ln.match(/^ANSWER:\s*(.*)$/i);
          const typeMatch = ln.match(/^TYPE:\s*(.*)$/i);
          if (optMatch){
            opts[optMatch[1].toUpperCase()] = optMatch[2].trim();
          } else if (answerMatch){
            answer = answerMatch[1].trim().toUpperCase();
          } else if (typeMatch){
            if (typeMatch[1].trim().toUpperCase() === "ESSAY") qtype = "ESSAY";
          }
          i++;
        }
        const q = {
          id: Math.random().toString(36).slice(2,9),
          text: qText,
          type: qtype,
          options: Object.keys(opts).length>0 ? Object.entries(opts).map(([k,v])=>({key:k, text:v})) : [],
          answer: answer,
        };
        questions.push(q);
      } else {
        i++;
      }
    }
    return { questions };
  }

  function deleteExam(id){
    if (!confirm("Hapus ujian ini?")) return;
    setExams(prev => prev.filter(e=>e.id!==id));
    if (currentExamId === id) setCurrentExamId(null);
  }

  return (
    <div style={{fontFamily:"system-ui,Arial", padding:"16px", background:"#f7fafc", minHeight:"100vh"}}>
      <header style={{maxWidth:800, margin:"0 auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div style={{display:"flex", gap:12, alignItems:"center"}}>
            <div style={{background:"#fff", padding:8, borderRadius:12, boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}><FilePlus/></div>
            <div>
              <h1 style={{fontSize:20, margin:0}}>Ujian Online - Demo</h1>
              <div style={{color:"#4a5568", fontSize:13}}>Unggah .docx berisi soal, sistem akan memproses.</div>
            </div>
          </div>
          <div>
            {!userRole ? (
              <>
                <button onClick={()=>loginAs("teacher")} style={{marginRight:8, padding:"8px 12px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8}}>Login Guru</button>
                <button onClick={()=>loginAs("student")} style={{padding:"8px 12px", borderRadius:8}}>Masuk Siswa</button>
              </>
            ) : (
              <div style={{display:"flex", gap:8, alignItems:"center"}}>
                <User/>
                <span style={{fontSize:14}}>{userRole==="teacher"? teacherName+" (Guru)" : "Siswa"}</span>
                <button onClick={()=>{setUserRole(null); setCurrentExamId(null);}} style={{marginLeft:8, fontSize:12}}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main style={{maxWidth:800, margin:"16px auto"}}>
        {userRole==="teacher" && (
          <section style={{background:"#fff", padding:16, borderRadius:12, boxShadow:"0 1px 2px rgba(0,0,0,0.04)", marginBottom:16}}>
            <h2 style={{margin:0, display:"flex", alignItems:"center", gap:8}}><Edit3/> Dashboard Guru</h2>
            <p style={{color:"#4a5568"}}>Unggah file .docx yang berisi soal. Lihat contoh format di bawah.</p>
            <div style={{marginTop:12}}>
              <label>Nama Guru</label>
              <input value={teacherName} onChange={e=>setTeacherName(e.target.value)} style={{display:"block", width:"100%", padding:8, marginTop:6, borderRadius:8}} />
            </div>
            <div style={{marginTop:12}}>
              <label>Unggah file .docx</label>
              <input ref={fileInputRef} type="file" accept=".doc,.docx" onChange={handleDocxUpload} style={{display:"block", marginTop:8}} />
              <div style={{fontSize:12, color:"#4a5568", marginTop:8}}>
                Contoh format:<br/>
                Q: Apa ibukota Indonesia?<br/>
                A) Jakarta<br/>
                B) Bandung<br/>
                ANSWER: A
              </div>
            </div>

            <div style={{marginTop:12}}>
              <h3>Ujian yang tersedia</h3>
              <div>
                {exams.length===0 ? <div style={{color:"#718096"}}>Belum ada ujian.</div> : exams.map(ex=>(
                  <div key={ex.id} style={{display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #edf2f7"}}>
                    <div>
                      <div style={{fontWeight:600}}>{ex.title}</div>
                      <div style={{fontSize:12, color:"#718096"}}>Soal: {ex.questions.length} • Dibuat: {new Date(ex.createdAt).toLocaleString()}</div>
                    </div>
                    <div style={{display:"flex", gap:8}}>
                      <button onClick={()=>setCurrentExamId(ex.id)} style={{padding:"6px 10px"}}>Buka</button>
                      <button onClick={()=>deleteExam(ex.id)} style={{padding:"6px 10px", color:"#e53e3e"}}>Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {message && <div style={{marginTop:12, color:"#2563eb"}}>{message}</div>}
          </section>
        )}

        {userRole==="student" && (
          <section style={{background:"#fff", padding:16, borderRadius:12, boxShadow:"0 1px 2px rgba(0,0,0,0.04)", marginBottom:16}}>
            <h2 style={{margin:0, display:"flex", alignItems:"center", gap:8}}><Play/> Pilih Ujian</h2>
            {exams.length===0 ? <div style={{color:"#718096", marginTop:8}}>Belum ada ujian tersedia.</div> : (
              <div style={{marginTop:12}}>
                {exams.map(ex=>(
                  <div key={ex.id} style={{padding:12, border:"1px solid #e6edf3", borderRadius:8, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                    <div>
                      <div style={{fontWeight:600}}>{ex.title}</div>
                      <div style={{fontSize:12, color:"#718096"}}>Guru: {ex.teacher} • Soal: {ex.questions.length}</div>
                    </div>
                    <div>
                      <button onClick={()=>setCurrentExamId(ex.id)} style={{padding:"8px 12px", background:"#16a34a", color:"#fff", borderRadius:8}}>Mulai</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {!userRole && (
          <section style={{background:"#fff", padding:16, borderRadius:12, boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}>
            <h2>Selamat datang</h2>
            <div style={{color:"#4a5568"}}>Pilih sebagai Guru untuk mengunggah soal lewat Word, atau sebagai Siswa untuk mengerjakan ujian yang tersedia.</div>
          </section>
        )}

        {currentExamId && (
          <ExamDetail exam={exams.find(e=>e.id===currentExamId)} onClose={()=>setCurrentExamId(null)} />
        )}
      </main>

      <footer style={{maxWidth:800, margin:"24px auto", textAlign:"center", color:"#a0aec0"}}>Demo aplikasi ujian online • Untuk produksi diperlukan backend aman.</footer>
    </div>
  );
}

function ExamDetail({exam, onClose}){
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState((exam.timeLimitMinutes||30)*60);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const timerRef = useRef(null);

  useEffect(()=>{ if(started){
    timerRef.current = setInterval(()=>{
      setTimeLeft(t=>{
        if (t<=1){ clearInterval(timerRef.current); setFinished(true); return 0; }
        return t-1;
      });
    },1000);
  }
  return ()=>clearInterval(timerRef.current);
  },[started]);

  function startExam(){ setStarted(true); setFinished(false); setTimeLeft((exam.timeLimitMinutes||30)*60); }
  function handleSelect(qid, value){ setAnswers(a=>({...a, [qid]: value})); }
  function submit(){ setFinished(true); clearInterval(timerRef.current); }

  const score = computeScore(exam.questions, answers);

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:16, zIndex:50}}>
      <div style={{background:"#fff", width:"100%", maxWidth:900, borderRadius:12, padding:16, maxHeight:"90vh", overflow:"auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"start"}}>
          <div>
            <h3 style={{margin:0}}>{exam.title}</h3>
            <div style={{fontSize:12, color:"#718096"}}>Guru: {exam.teacher} • Soal: {exam.questions.length}</div>
          </div>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            {!started && <div style={{fontSize:13, color:"#718096"}}>Waktu: {exam.timeLimitMinutes||30} menit</div>}
            {started && !finished && <div style={{fontSize:13}}>Sisa: {formatTime(timeLeft)}</div>}
            <button onClick={onClose} style={{fontSize:13, color:"#4a5568"}}>Tutup</button>
          </div>
        </div>

        <div style={{marginTop:12}}>
          {!started && (
            <div>
              <p style={{color:"#4a5568"}}>Petunjuk: Pastikan koneksi stabil. Klik Mulai untuk memulai ujian.</p>
              <div style={{display:"flex", gap:8}}>
                <button onClick={startExam} style={{padding:"8px 12px", background:"#2563eb", color:"#fff", borderRadius:8}}>Mulai Ujian</button>
                <button onClick={onClose} style={{padding:"8px 12px", borderRadius:8}}>Batal</button>
              </div>
            </div>
          )}

          {started && (
            <div style={{marginTop:12}}>
              {exam.questions.map((q, idx)=>(
                <div key={q.id} style={{padding:12, border:"1px solid #edf2f7", borderRadius:8, marginBottom:8}}>
                  <div style={{fontWeight:600}}>{idx+1}. {q.text}</div>
                  {q.type === "MCQ" ? (
                    <div style={{marginTop:8, display:"grid", gap:8}}>
                      {q.options.map(opt=>(
                        <label key={opt.key} style={{display:"block", padding:8, borderRadius:8, border:"1px solid transparent"}}>
                          <input type="radio" name={q.id} value={opt.key} checked={answers[q.id]===opt.key} onChange={()=>handleSelect(q.id, opt.key)} style={{marginRight:8}}/>
                          <strong>{opt.key})</strong> <span style={{marginLeft:8}}>{opt.text}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea value={answers[q.id]||""} onChange={e=>handleSelect(q.id, e.target.value)} rows={4} style={{width:"100%", marginTop:8, padding:8}} />
                  )}
                </div>
              ))}

              {!finished && (
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <div style={{color:"#718096"}}>Teliti jawaban sebelum mengirim.</div>
                  <div>
                    <button onClick={submit} style={{padding:"8px 12px", background:"#16a34a", color:"#fff", borderRadius:8}}>Kirim Jawaban</button>
                  </div>
                </div>
              )}

              {finished && (
                <div style={{padding:12, background:"#f7fafc", borderRadius:8}}>
                  <div style={{fontWeight:600}}>Hasil Sementara</div>
                  <div style={{marginTop:8}}>Nilai otomatis (hanya MCQ): {score.correct}/{score.totalMCQ} benar • Skor: {Math.round((score.correct/(score.totalMCQ||1))*100)}%</div>
                  <div style={{marginTop:8, fontSize:12, color:"#718096"}}>Catatan: Soal esai perlu dinilai guru secara manual.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function computeScore(questions, answers){
  let correct = 0;
  let totalMCQ = 0;
  for (const q of questions){
    if (q.type === "MCQ"){
      totalMCQ++;
      if (q.answer && answers[q.id] && q.answer.toUpperCase() === answers[q.id].toUpperCase()) correct++;
    }
  }
  return {correct, totalMCQ};
}

function formatTime(s){
  const mm = Math.floor(s/60).toString().padStart(2,'0');
  const ss = (s%60).toString().padStart(2,'0');
  return `${mm}:${ss}`;
}
