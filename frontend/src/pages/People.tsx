import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Row,
  Tree,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Space,
  Tag,
  message,
  Popconfirm,
  TreeSelect,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { api, Meta } from "../api";
import { useAuth } from "../auth";

function toTreeNodes(nodes: any[]): any[] {
  return nodes.map((n) => ({
    title: `${n.name}（${n.node_type === "class" ? "班级" : "部门"}·${n.user_count}人）`,
    key: n.id,
    raw: n,
    children: n.children ? toTreeNodes(n.children) : [],
  }));
}
function toTreeSelect(nodes: any[]): any[] {
  return nodes.map((n) => ({
    title: n.name,
    value: n.id,
    children: n.children ? toTreeSelect(n.children) : [],
  }));
}

export default function People() {
  const { has } = useAuth();
  const [tree, setTree] = useState<any[]>([]);
  const [treeRaw, setTreeRaw] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);

  const [deptOpen, setDeptOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deptForm] = Form.useForm();
  const [userForm] = Form.useForm();

  const loadTree = async () => {
    const { data } = await api.get("/departments/tree");
    setTreeRaw(data);
    setTree(toTreeNodes(data));
  };
  const loadUsers = async (deptId: number | null) => {
    const { data } = await api.get("/users", {
      params: deptId ? { department_id: deptId } : {},
    });
    setUsers(data);
  };

  useEffect(() => {
    loadTree();
    loadUsers(null);
    api.get<Meta>("/auth/meta").then((r) => setMeta(r.data));
  }, []);

  const onSelectDept = (keys: any[]) => {
    const id = keys[0] ?? null;
    setSelected(id);
    loadUsers(id);
  };

  // ----- Department CRUD -----
  const submitDept = async () => {
    const v = await deptForm.validateFields();
    await api.post("/departments", {
      name: v.name,
      node_type: v.node_type,
      parent_id: v.parent_id ?? null,
    });
    message.success("已添加");
    setDeptOpen(false);
    deptForm.resetFields();
    loadTree();
  };
  const deleteDept = async (id: number) => {
    try {
      await api.delete(`/departments/${id}`);
      message.success("已删除");
      loadTree();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || "删除失败");
    }
  };

  // ----- User create/edit -----
  const openCreateUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    userForm.setFieldsValue({
      role: "student",
      department_id: selected,
      permissions: meta?.default_role_permissions["student"] || [],
    });
    setUserOpen(true);
  };
  const openEditUser = (u: any) => {
    setEditingUser(u);
    userForm.setFieldsValue({
      full_name: u.full_name,
      role: u.role,
      department_id: u.department_id,
      permissions: u.permissions,
    });
    setUserOpen(true);
  };
  const onRoleChange = (role: string) => {
    userForm.setFieldsValue({
      permissions: meta?.default_role_permissions[role] || [],
    });
  };
  const submitUser = async () => {
    const v = await userForm.validateFields();
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          full_name: v.full_name,
          role: v.role,
          department_id: v.department_id,
          permissions: v.permissions,
          ...(v.password ? { password: v.password } : {}),
        });
        message.success("已更新");
      } else {
        await api.post("/users", {
          username: v.username,
          password: v.password,
          full_name: v.full_name,
          role: v.role,
          department_id: v.department_id,
          permissions: v.permissions,
        });
        message.success("已新增");
      }
      setUserOpen(false);
      userForm.resetFields();
      loadUsers(selected);
      loadTree();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || "保存失败");
    }
  };
  const disableUser = async (id: number) => {
    await api.delete(`/users/${id}`);
    message.success("已禁用");
    loadUsers(selected);
  };

  const canManageDept = has("manage_departments");
  const canManageUser = has("manage_users");
  const roleLabel: Record<string, string> = {
    admin: "管理员",
    counselor: "咨询师/教师",
    student: "学员",
  };

  return (
    <div>
      <h2 className="page-title">人员与班级</h2>
      <Row gutter={16}>
        <Col span={7}>
          <Card
            title="组织架构（部门/班级，多级）"
            size="small"
            extra={
              canManageDept && (
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    deptForm.resetFields();
                    deptForm.setFieldsValue({ node_type: "department" });
                    setDeptOpen(true);
                  }}
                >
                  新建
                </Button>
              )
            }
          >
            <Tree
              treeData={tree}
              defaultExpandAll
              onSelect={onSelectDept}
              titleRender={(node: any) => (
                <Space>
                  <span>{node.title}</span>
                  {canManageDept && (
                    <Popconfirm
                      title="确认删除该部门？"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        deleteDept(node.key);
                      }}
                    >
                      <a
                        style={{ color: "#f5222d", fontSize: 12 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        删除
                      </a>
                    </Popconfirm>
                  )}
                </Space>
              )}
            />
          </Card>
        </Col>
        <Col span={17}>
          <Card
            title={
              selected
                ? "成员列表（所选部门）"
                : "成员列表（全部，可在左侧选择部门筛选）"
            }
            size="small"
            extra={
              canManageUser && (
                <Button type="primary" size="small" onClick={openCreateUser}>
                  新增人员
                </Button>
              )
            }
          >
            <Table
              rowKey="id"
              size="small"
              dataSource={users}
              columns={[
                { title: "用户名", dataIndex: "username" },
                { title: "姓名", dataIndex: "full_name" },
                {
                  title: "角色",
                  dataIndex: "role",
                  render: (r) => <Tag>{roleLabel[r]}</Tag>,
                },
                { title: "所属部门", dataIndex: "department_name" },
                {
                  title: "已授予功能",
                  dataIndex: "permissions",
                  render: (perms: string[]) => (
                    <>
                      {(perms || []).map((p) => {
                        const m = meta?.permissions.find((x) => x.key === p);
                        return <Tag key={p}>{m?.label || p}</Tag>;
                      })}
                    </>
                  ),
                },
                {
                  title: "状态",
                  dataIndex: "is_active",
                  render: (a) =>
                    a ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>,
                },
                {
                  title: "操作",
                  render: (_, u) =>
                    canManageUser && (
                      <Space>
                        <a onClick={() => openEditUser(u)}>编辑</a>
                        <Popconfirm
                          title="禁用该账号？"
                          onConfirm={() => disableUser(u.id)}
                        >
                          <a style={{ color: "#f5222d" }}>禁用</a>
                        </Popconfirm>
                      </Space>
                    ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Department modal */}
      <Modal
        title="新建部门 / 班级"
        open={deptOpen}
        onOk={submitDept}
        onCancel={() => setDeptOpen(false)}
      >
        <Form form={deptForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="node_type" label="类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "department", label: "部门" },
                { value: "class", label: "班级" },
              ]}
            />
          </Form.Item>
          <Form.Item name="parent_id" label="上级（留空为顶级）">
            <TreeSelect
              treeData={toTreeSelect(treeRaw)}
              treeDefaultExpandAll
              allowClear
              placeholder="选择上级部门"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* User modal */}
      <Modal
        title={editingUser ? "编辑人员 / 权限" : "新增人员"}
        open={userOpen}
        onOk={submitUser}
        onCancel={() => setUserOpen(false)}
        width={620}
      >
        <Form form={userForm} layout="vertical">
          {!editingUser && (
            <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          )}
          <Form.Item
            name="password"
            label={editingUser ? "重置密码（留空不修改）" : "初始密码"}
            rules={editingUser ? [] : [{ required: true }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="full_name" label="姓名">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色（多级管理）" rules={[{ required: true }]}>
            <Select
              onChange={onRoleChange}
              options={(meta?.roles || []).map((r) => ({
                value: r.key,
                label: r.label,
              }))}
            />
          </Form.Item>
          <Form.Item name="department_id" label="所属部门/班级（可挪动）">
            <TreeSelect
              treeData={toTreeSelect(treeRaw)}
              treeDefaultExpandAll
              allowClear
              placeholder="选择部门/班级"
            />
          </Form.Item>
          <Form.Item name="permissions" label="授予功能权限（勾选）">
            <Checkbox.Group>
              <Row>
                {(meta?.permissions || []).map((p) => (
                  <Col span={12} key={p.key} style={{ marginBottom: 8 }}>
                    <Checkbox value={p.key}>{p.label}</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
