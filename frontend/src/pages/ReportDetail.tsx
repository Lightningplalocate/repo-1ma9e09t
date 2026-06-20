import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Row,
  Table,
  Tag,
  Switch,
  Button,
  Descriptions,
  Space,
  Alert,
  Input,
  Select,
  message,
} from "antd";
import {
  PrinterOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import { useNavigate, useParams } from "react-router-dom";
import { api, downloadFile, CRISIS_COLORS, CRISIS_LABELS } from "../api";
import { useAuth } from "../auth";

interface FactorScore {
  key: string;
  name: string;
  score: number;
  sum: number;
  items: number;
}
interface Answer {
  order: number;
  text: string;
  factor_name: string;
  choice_label: string;
  score: number;
}
interface Report {
  id: number;
  user_name: string;
  student_no?: string;
  gender?: string;
  birth_date?: string;
  department_name?: string;
  scale_name: string;
  report_type: string;
  total_score: number;
  crisis_level: string;
  ai_analysis: string;
  counselor_advice: string;
  counselor_id?: number | null;
  counselor_name: string;
  answers: Answer[];
  factor_scores: FactorScore[];
  submitted_at: string;
}

export default function ReportDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { has, user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [showAI, setShowAI] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [advice, setAdvice] = useState("");
  const [signId, setSignId] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const canEdit =
    user?.role === "admin" || user?.role === "counselor" || has("edit_reports");

  const load = async () => {
    const { data } = await api.get<Report>(`/reports/${id}`);
    setReport(data);
    setAdvice(data.counselor_advice || "");
    setSignId(data.counselor_id || undefined);
  };

  useEffect(() => {
    load();
    if (canEdit) api.get("/users/staff").then((r) => setStaff(r.data)).catch(() => {});
  }, [id]);

  const saveAdvice = async () => {
    setSaving(true);
    try {
      await api.put(`/reports/${id}`, {
        counselor_advice: advice,
        counselor_id: signId ?? null,
      });
      message.success("已保存咨询师建议与签名");
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (!report) return null;

  const factors = report.factor_scores;
  const lineOption = {
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: factors.map((f) => f.name) },
    yAxis: { type: "value", name: "因子均分" },
    series: [
      {
        type: "line",
        smooth: true,
        data: factors.map((f) => f.score),
        areaStyle: {},
        markLine: {
          data: [{ yAxis: 3, name: "预警线" }],
          lineStyle: { color: "#f5222d" },
        },
      },
    ],
  };
  const barOption = {
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: factors.map((f) => f.name) },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        data: factors.map((f) => ({
          value: f.score,
          itemStyle: { color: f.score >= 3 ? "#f5222d" : "#2f6bff" },
        })),
      },
    ],
  };
  const pieOption = {
    tooltip: { trigger: "item" },
    legend: { bottom: 0 },
    series: [
      {
        type: "pie",
        radius: ["35%", "65%"],
        data: factors.map((f) => ({ name: f.name, value: f.sum })),
      },
    ],
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: "24px 0" }}>
      {/* 整体内容居中，且不显示左侧软件模块栏 */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 16px" }}>
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
            alignItems: "center",
          }}
        >
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => nav(-1)}>
              返回
            </Button>
            <h2 className="page-title" style={{ marginBottom: 0 }}>
              测评报告详情
            </h2>
          </Space>
          <Space>
            <span>显示 AI 分析</span>
            <Switch checked={showAI} onChange={setShowAI} />
            {canEdit && (
              <Button onClick={() => nav(`/reports/${id}/edit`)}>修改报告</Button>
            )}
            <Button
              icon={<FileWordOutlined />}
              onClick={() =>
                downloadFile(`/reports/${id}/export/word`, `报告_${id}.docx`)
              }
            >
              导出 Word
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={() =>
                downloadFile(`/reports/${id}/export/excel`, `报告_${id}.xlsx`)
              }
            >
              导出 Excel
            </Button>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              打印
            </Button>
          </Space>
        </div>

        <Card style={{ marginBottom: 16 }}>
          <Descriptions column={3} title="基本信息">
            <Descriptions.Item label="来访者">{report.user_name}</Descriptions.Item>
            <Descriptions.Item label="学号">
              {report.student_no || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="性别">{report.gender || "-"}</Descriptions.Item>
            <Descriptions.Item label="出生日期">
              {report.birth_date || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="班级/部门">
              {report.department_name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="咨询师">
              {report.counselor_name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="量表">{report.scale_name}</Descriptions.Item>
            <Descriptions.Item label="总分">{report.total_score}</Descriptions.Item>
            <Descriptions.Item label="风险等级">
              <Tag color={CRISIS_COLORS[report.crisis_level]}>
                {CRISIS_LABELS[report.crisis_level]}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card title="因子趋势曲线">
              <ReactECharts style={{ height: 260 }} option={lineOption} />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="因子得分柱状图">
              <ReactECharts style={{ height: 260 }} option={barOption} />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="因子占比饼图">
              <ReactECharts style={{ height: 260 }} option={pieOption} />
            </Card>
          </Col>
        </Row>

        <Card title="因子分析" style={{ marginBottom: 16 }}>
          <Table
            rowKey="key"
            pagination={false}
            dataSource={factors}
            columns={[
              { title: "因子", dataIndex: "name" },
              { title: "题目数", dataIndex: "items" },
              { title: "总分", dataIndex: "sum" },
              { title: "均分", dataIndex: "score" },
              {
                title: "评估",
                dataIndex: "score",
                render: (v: number) =>
                  v >= 3 ? (
                    <Tag color="red">偏高，建议关注</Tag>
                  ) : v >= 2 ? (
                    <Tag color="orange">中等</Tag>
                  ) : (
                    <Tag color="green">正常</Tag>
                  ),
              },
            ]}
          />
        </Card>

        {showAI && (
          <Card
            title="AI 分析（第三人称视角，可隐藏 / 不打印）"
            style={{ marginBottom: 16 }}
          >
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="此部分为 AI 辅助分析，仅供参考；关闭右上角开关后将不会打印。"
            />
            <div style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
              {report.ai_analysis}
            </div>
          </Card>
        )}

        <Card title="逐题作答明细" style={{ marginBottom: 16 }}>
          <Table
            rowKey="order"
            size="small"
            pagination={false}
            dataSource={report.answers}
            columns={[
              { title: "题号", dataIndex: "order", width: 70 },
              { title: "题目", dataIndex: "text" },
              { title: "所属因子", dataIndex: "factor_name", width: 120 },
              { title: "作答", dataIndex: "choice_label", width: 100 },
              { title: "得分", dataIndex: "score", width: 70 },
            ]}
          />
        </Card>

        {/* 报告底部：咨询师建议 + 咨询师签名 */}
        <Card title="咨询师建议">
          {canEdit ? (
            <>
              <Input.TextArea
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                autoSize={{ minRows: 4 }}
                placeholder="在此填写咨询师建议（可自主编辑）"
              />
              <div
                className="no-print"
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span>咨询师签名：</span>
                <Select
                  style={{ width: 220 }}
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
                <Button type="primary" loading={saving} onClick={saveAdvice}>
                  确定
                </Button>
              </div>
            </>
          ) : (
            <div style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
              {report.counselor_advice || "（暂无）"}
            </div>
          )}
          <div style={{ marginTop: 16, textAlign: "right" }}>
            咨询师签名：
            <span
              style={{
                display: "inline-block",
                minWidth: 160,
                borderBottom: "1px solid #999",
                textAlign: "center",
              }}
            >
              {report.counselor_name || ""}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
