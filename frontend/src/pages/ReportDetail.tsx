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
} from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import { useParams } from "react-router-dom";
import { api, CRISIS_COLORS, CRISIS_LABELS } from "../api";

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
  department_name?: string;
  scale_name: string;
  report_type: string;
  total_score: number;
  crisis_level: string;
  ai_analysis: string;
  answers: Answer[];
  factor_scores: FactorScore[];
  submitted_at: string;
}

export default function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState<Report | null>(null);
  const [showAI, setShowAI] = useState(true);

  useEffect(() => {
    api.get<Report>(`/reports/${id}`).then((r) => setReport(r.data));
  }, [id]);

  if (!report) return null;

  const factors = report.factor_scores;
  // average score per factor as proxy for time/factor trend curve
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
    <div>
      <div
        style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}
      >
        <h2 className="page-title" style={{ marginBottom: 0 }}>
          测评报告详情
        </h2>
        <Space>
          <span>显示 AI 分析</span>
          <Switch checked={showAI} onChange={setShowAI} />
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            打印 / 导出
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={3}>
          <Descriptions.Item label="来访者">{report.user_name}</Descriptions.Item>
          <Descriptions.Item label="班级/部门">
            {report.department_name || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="量表">{report.scale_name}</Descriptions.Item>
          <Descriptions.Item label="报告类型">
            {report.report_type === "self" ? "自评" : "他评"}
          </Descriptions.Item>
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
        <Card title="AI 分析（第三人称视角，可隐藏 / 不打印）" style={{ marginBottom: 16 }}>
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

      <Card title="逐题作答明细">
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
    </div>
  );
}
