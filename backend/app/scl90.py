"""SCL-90 症状自评量表（标准医用版本）。

包含 90 个条目、9 个症状因子（另含 7 个附加项目），采用 1-5 级评分。
因子与条目的对应关系依据 Derogatis SCL-90-R 标准中文版常模。

说明（信效度）：SCL-90 为国际广泛使用并经反复验证的标准自评量表，国内常模
（金华等，1986）报告各因子内部一致性信度（Cronbach's α）约 0.80-0.90，
重测信度约 0.70 以上，具有良好的结构效度。真实信效度需结合本机构样本数据
另行统计（α 系数、因子分析），此处录入的是标准量表结构与常模阈值。
"""

# 5 级评分：没有(1) / 很轻(2) / 中等(3) / 偏重(4) / 严重(5)
SCL90_OPTIONS = [
    {"label": "没有", "score": 1},
    {"label": "很轻", "score": 2},
    {"label": "中等", "score": 3},
    {"label": "偏重", "score": 4},
    {"label": "严重", "score": 5},
]

SCL90_FACTORS = [
    {"key": "somatization", "name": "躯体化"},
    {"key": "obsessive", "name": "强迫症状"},
    {"key": "interpersonal", "name": "人际关系敏感"},
    {"key": "depression", "name": "抑郁"},
    {"key": "anxiety", "name": "焦虑"},
    {"key": "hostility", "name": "敌对"},
    {"key": "phobic", "name": "恐怖"},
    {"key": "paranoid", "name": "偏执"},
    {"key": "psychoticism", "name": "精神病性"},
    {"key": "other", "name": "其他（睡眠/饮食）"},
]

# (题号, 题干, 因子key)
SCL90_ITEMS = [
    (1, "头痛", "somatization"),
    (2, "神经过敏，心中不踏实", "anxiety"),
    (3, "头脑中有不必要的想法或字句盘旋", "obsessive"),
    (4, "头昏或昏倒", "somatization"),
    (5, "对异性的兴趣减退", "depression"),
    (6, "对旁人责备求全", "interpersonal"),
    (7, "感到别人能控制您的思想", "psychoticism"),
    (8, "责怪别人制造麻烦", "paranoid"),
    (9, "忘性大", "obsessive"),
    (10, "担心自己的衣饰整齐及仪态的端正", "obsessive"),
    (11, "容易烦恼和激动", "hostility"),
    (12, "胸痛", "somatization"),
    (13, "害怕空旷的场所或街道", "phobic"),
    (14, "感到自己的精力下降，活动减慢", "depression"),
    (15, "想结束自己的生命", "depression"),
    (16, "听到旁人听不到的声音", "psychoticism"),
    (17, "发抖", "anxiety"),
    (18, "感到大多数人都不可信任", "paranoid"),
    (19, "胃口不好", "other"),
    (20, "容易哭泣", "depression"),
    (21, "同异性相处时感到害羞不自在", "interpersonal"),
    (22, "感到受骗、中了圈套或有人想抓住您", "depression"),
    (23, "无缘无故地突然感到害怕", "anxiety"),
    (24, "自己不能控制地大发脾气", "hostility"),
    (25, "怕单独出门", "phobic"),
    (26, "经常责怪自己", "depression"),
    (27, "腰痛", "somatization"),
    (28, "感到难以完成任务", "obsessive"),
    (29, "感到孤独", "depression"),
    (30, "感到苦闷", "depression"),
    (31, "过分担忧", "depression"),
    (32, "对事物不感兴趣", "depression"),
    (33, "感到害怕", "anxiety"),
    (34, "您的感情容易受到伤害", "interpersonal"),
    (35, "旁人能知道您的私下想法", "psychoticism"),
    (36, "感到别人不理解您、不同情您", "interpersonal"),
    (37, "感到人们对您不友好，不喜欢您", "interpersonal"),
    (38, "做事必须做得很慢以保证做得正确", "obsessive"),
    (39, "心跳得很厉害", "anxiety"),
    (40, "恶心或胃部不舒服", "somatization"),
    (41, "感到比不上他人", "interpersonal"),
    (42, "肌肉酸痛", "somatization"),
    (43, "感到有人在监视您、谈论您", "paranoid"),
    (44, "难以入睡", "other"),
    (45, "做事必须反复检查", "obsessive"),
    (46, "难以做出决定", "obsessive"),
    (47, "怕乘电车、公共汽车、地铁或火车", "phobic"),
    (48, "呼吸有困难", "somatization"),
    (49, "一阵阵发冷或发热", "somatization"),
    (50, "因为感到害怕而避开某些东西、场合或活动", "phobic"),
    (51, "脑子变空了", "obsessive"),
    (52, "身体发麻或刺痛", "somatization"),
    (53, "喉咙有梗塞感", "somatization"),
    (54, "感到前途没有希望", "depression"),
    (55, "不能集中注意", "obsessive"),
    (56, "感到身体的某一部分软弱无力", "somatization"),
    (57, "感到紧张或容易紧张", "anxiety"),
    (58, "感到手或脚发重", "somatization"),
    (59, "想到死亡的事", "other"),
    (60, "吃得太多", "other"),
    (61, "当别人看着您或谈论您时感到不自在", "interpersonal"),
    (62, "有一些不属于您自己的想法", "psychoticism"),
    (63, "有想打人或伤害他人的冲动", "hostility"),
    (64, "醒得太早", "other"),
    (65, "必须反复洗手、点数目或触摸某些东西", "obsessive"),
    (66, "睡得不稳不深", "other"),
    (67, "有想摔坏或破坏东西的冲动", "hostility"),
    (68, "有一些别人没有的想法或念头", "paranoid"),
    (69, "感到对别人神经过敏", "interpersonal"),
    (70, "在商店或电影院等人多的地方感到不自在", "phobic"),
    (71, "感到任何事情都很难做", "depression"),
    (72, "一阵阵恐惧或惊恐", "anxiety"),
    (73, "感到在公共场合吃东西很不舒服", "interpersonal"),
    (74, "经常与人争论", "hostility"),
    (75, "单独一人时神经很紧张", "phobic"),
    (76, "别人对您的成绩没有作出恰当的评价", "paranoid"),
    (77, "即使和别人在一起也感到孤独", "psychoticism"),
    (78, "感到坐立不安心神不定", "anxiety"),
    (79, "感到自己没有什么价值", "depression"),
    (80, "感到熟悉的东西变成陌生或不像是真的", "anxiety"),
    (81, "大叫或摔东西", "hostility"),
    (82, "害怕会在公共场合昏倒", "phobic"),
    (83, "感到别人想占您的便宜", "paranoid"),
    (84, "为一些有关性的想法而很苦恼", "psychoticism"),
    (85, "您认为应该因为自己的过错而受到惩罚", "psychoticism"),
    (86, "感到要赶快把事情做完", "anxiety"),
    (87, "感到自己的身体有严重问题", "psychoticism"),
    (88, "从未感到和其他人很亲近", "psychoticism"),
    (89, "感到自己有罪", "psychoticism"),
    (90, "感到自己的脑子有毛病", "psychoticism"),
]

# 危机预警规则（因子均分阈值；2 分以上为阳性，3 分以上为中重度症状）
SCL90_CRISIS_RULES = [
    {"factor": "depression", "op": ">=", "threshold": 2.0, "level": "medium"},
    {"factor": "depression", "op": ">=", "threshold": 3.0, "level": "high"},
    {"factor": "anxiety", "op": ">=", "threshold": 2.0, "level": "low"},
    {"factor": "anxiety", "op": ">=", "threshold": 3.0, "level": "high"},
    {"factor": "psychoticism", "op": ">=", "threshold": 3.0, "level": "high"},
    {"factor": "paranoid", "op": ">=", "threshold": 3.0, "level": "medium"},
]


def build_scl90(db, Scale, Question):
    """在数据库中创建标准 SCL-90 量表，返回 Scale 实例。"""
    scale = Scale(
        name="症状自评量表 SCL-90（标准版）",
        description="国际通用的精神症状自评量表，含 90 题、9 个症状因子，1-5 级评分。",
        instructions=(
            "以下表格中列出了有些人可能会有的问题，请仔细阅读每一条，"
            "然后根据最近一周内下述情况影响您的实际感觉，选择最符合的程度："
            "没有/很轻/中等/偏重/严重。"
        ),
        factors=SCL90_FACTORS,
        crisis_rules=SCL90_CRISIS_RULES,
    )
    db.add(scale)
    db.flush()
    for order, text, factor in SCL90_ITEMS:
        db.add(
            Question(
                scale_id=scale.id,
                order=order,
                text=text,
                factor=factor,
                options=SCL90_OPTIONS,
            )
        )
    return scale
