import { useEffect, useState } from "react";
import { Card, Table, Tag, Button, Modal, Radio, Space, message } from "antd";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

interface Assignment {
  id: number;
  task_title: string;
  scale_id: number;
  scale_name: string;
  status: string;
}

export default function MyAssessments() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Assignment[]>([]);
  const [active, setActive] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const load = () => api.get("/tasks/mine").then((r) => setRows(r.data));
  useEffect(() => {
    load();
  }, []);

  const start = async (a: Assignment) => {
    const { data } = await api.get(`/scales/${a.scale_id}`);
    setQuestions(data.questions);
    setAnswers({});
    setActive(a);
  };

  const submit = async () => {
    if (!active) return;
    if (Object.keys(answers).length < questions.length) {
      message.warning("请完成所有题目");
      return;
    }
    const payload = {
      assignment_id: active.id,
      answers: Object.entries(answers).map(([qid, ci]) => ({
        question_id: Number(qid),
        choice_index: ci,
      })),
    };
    const { data } = await api.post("/reports/submit", payload);
    message.success("提交成功");
    setActive(null);
    load();
    nav(`/reports/${data.id}`);
  };

  return (
    <div>
      <h2 className="page-title">我的测评</h2>
      <Card>
        <Table
          rowKey="id"
          dataSource={rows}
          columns={[
            { title: "任务", dataIndex: "task_title" },
            { title: "量表", dataIndex: "scale_name" },
            {
              title: "状态",
              dataIndex: "status",
              render: (s) =>
                s === "completed" ? (
                  <Tag color="green">已完成</Tag>
                ) : (
                  <Tag color="orange">待完成</Tag>
                ),
            },
            {
              title: "操作",
              render: (_, r) =>
                r.status === "completed" ? (
                  <span style={{ color: "#aaa" }}>已提交</span>
                ) : (
                  <Button type="link" onClick={() => start(r)}>
                    开始测评
                  </Button>
                ),
            },
          ]}
        />
      </Card>

      <Modal
        title={active?.scale_name}
        open={!!active}
        onOk={submit}
        onCancel={() => setActive(null)}
        okText="提交"
        width={680}
      >
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          {questions.map((q) => (
            <div key={q.id} style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                {q.order}. {q.text}
              </div>
              <Radio.Group
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                }
                value={answers[q.id]}
              >
                <Space direction="vertical">
                  {q.options.map((o: any, idx: number) => (
                    <Radio key={idx} value={idx}>
                      {o.label}
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
