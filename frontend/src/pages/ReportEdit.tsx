import { useEffect, useState } from "react";
import {
  Card,
  Button,
  Input,
  Select,
  Radio,
  Space,
  message,
  Table,
  Tag,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

interface Option {
  label: string;
  score: number;
}
interface Question {
  id: number;
  order: number;
  text: string;
  factor: string;
  options: Option[];
}
interface Answer {
  question_id: number;
  order: number;
  text: string;
  factor_name: string;
  choice_label: string;
  score: number;
}

export default function ReportEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [choices, setChoices] = useState<Record<number, number>>({});
  const [advice, setAdvice] = useState("");
  const [signId, setSignId] = useState<number | undefined>(undefined);
  const [staff, setStaff] = useState<any[]>([]);
  const [info, setInfo] = useState<{ user_name: string; scale_name: string }>({
    user_name: "",
    scale_name: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: report } = await api.get(`/reports/${id}`);
      setAdvice(report.counselor_advice || "");
      setSignId(report.counselor_id || undefined);
      setInfo({ user_name: report.user_name, scale_name: report.scale_name });
      const { data: scale } = await api.get(`/scales/${report.scale_id}`);
      setQuestions(scale.questions);
      // 根据已作答的选项文字匹配当前选择
      const init: Record<number, number> = {};
      (report.answers as Answer[]).forEach((a) => {
        const q = scale.questions.find((x: Question) => x.id === a.question_id);
        if (q) {
          const idx = q.options.findIndex(
            (o: Option) => o.label === a.choice_label
          );
          init[a.question_id] = idx >= 0 ? idx : 0;
        }
      });
      setChoices(init);
      api.get("/users/staff").then((r) => setStaff(r.data)).catch(() => {});
    })();
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      const answers = Object.entries(choices).map(([qid, ci]) => ({
        question_id: Number(qid),
        choice_index: ci,
      }));
      await api.put(`/reports/${id}`, {
        counselor_advice: advice,
        counselor_id: signId ?? null,
        answers,
      });
      message.success("修改已保存，因子结果已自动重算");
      nav(`/reports/${id}`);
    } catch (e: any) {
      message.error(e?.response?.data?.detail || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: "24px 0" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 16px" }}>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => nav(-1)}>
            返回
          </Button>
          <h2 className="page-title" style={{ marginBottom: 0 }}>
            修改测评报告
          </h2>
        </Space>

        <Card style={{ marginBottom: 16 }}>
          来访者：<b>{info.user_name}</b>　量表：<b>{info.scale_name}</b>
          <Tag color="blue" style={{ marginLeft: 12 }}>
            修改答案后保存将自动按因子重算报告结果
          </Tag>
        </Card>

        <Card title="逐题作答（可修改）" style={{ marginBottom: 16 }}>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={questions}
            columns={[
              { title: "题号", dataIndex: "order", width: 60 },
              { title: "题目", dataIndex: "text" },
              {
                title: "作答",
                width: 360,
                render: (_, q: Question) => (
                  <Radio.Group
                    value={choices[q.id]}
                    onChange={(e) =>
                      setChoices({ ...choices, [q.id]: e.target.value })
                    }
                  >
                    {q.options.map((o, i) => (
                      <Radio key={i} value={i}>
                        {o.label}
                      </Radio>
                    ))}
                  </Radio.Group>
                ),
              },
            ]}
          />
        </Card>

        <Card title="咨询师建议" style={{ marginBottom: 16 }}>
          <Input.TextArea
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
            autoSize={{ minRows: 4 }}
            placeholder="在此填写咨询师建议"
          />
          <div style={{ marginTop: 12 }}>
            <span>咨询师签名：</span>
            <Select
              style={{ width: 240 }}
              allowClear
              placeholder="选择系统内咨询师/管理员"
              value={signId}
              onChange={setSignId}
              options={staff.map((s) => ({
                value: s.id,
                label: `${s.full_name || s.username}（${
                  s.role === "admin" ? "管理员" : "咨询师"
                }）`,
              }))}
            />
          </div>
        </Card>

        <div style={{ textAlign: "center" }}>
          <Button type="primary" size="large" loading={saving} onClick={save}>
            保存修改
          </Button>
        </div>
      </div>
    </div>
  );
}
