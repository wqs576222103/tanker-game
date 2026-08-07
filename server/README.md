# sszl-client-sdk

赛数助手 用户信息 SDK — 供外部应用通过 HTTP 获取用户信息。

---

## 引入依赖

在 `pom.xml` 中添加：

```xml
<dependency>
    <groupId>com.cisdi</groupId>
    <artifactId>sszl-client-sdk</artifactId>
    <version>0.0.1-SNAPSHOT</version>
</dependency>
```

---

## 配置服务地址

在 `application.yml` 中配置 sszl 后端的地址：

**测试环境：**

```yaml
sszl:
  client:
    base-url: http://8.130.41.52:9528
```

---

## 使用方式

### 方式一：注解激活 + 自动注入（推荐）

在启动类上加 `@EnableUserInfoClient`：

```java
@SpringBootApplication
@EnableUserInfoClient
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}
```

在业务代码中注入使用：

```java
@RestController
public class MyController {

    @Autowired
    private UserInfoRestClient userInfoRestClient;

    @GetMapping("/get-user")
    public String getUser(@RequestParam String token) {
        SimpleUserInfoDTO user = userInfoRestClient.getUserInfo(token);
        if (user == null) {
            return "token 无效或服务异常";
        }
        return String.format("%s - %s", user.getUsername(), user.getEmployeeId());
    }
}
```

### 方式二：手动创建（非 Spring 环境）

```java
UserInfoRestClient client = new UserInfoRestClient("http://8.130.41.52:9528");
SimpleUserInfoDTO user = client.getUserInfo(token);
```

### 方式三：Feign 客户端（已有 OpenFeign 的项目）

```java
@SpringBootApplication
@EnableFeignClients(basePackages = "com.cisdi.sszl.sdk")
public class MyApplication { ... }

@Autowired
private UserInfoFeignClient feignClient;

SimpleUserInfoDTO user = feignClient.getUserInfo(token);
```

---

## 获取 token

在赛数助理管理后台配置外部应用后，用户点击该应用跳转时，会在 URL 上自动拼接 token 参数，无需手动处理。

**跳转 URL 格式：**

```
http://外部应用地址/?token=xxx
```

外部应用从 URL 参数中获取 token 后，调用 SDK 的 `getUserInfo(token)` 即可查询当前用户信息。

---

## 返回数据模型

### SimpleUserInfoDTO

| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | 用户 ID |
| username | String | 用户姓名 |
| employeeId | String | 员工工号 |

## 常见问题

**Q：启动报错 `sszl.client.base-url` 未配置？**

A：在 `application.yml` 中添加：

```yaml
sszl:
  client:
    base-url: http://8.130.41.52:9528
```

**Q：调用返回 null？**

A：检查两点：
1. `sszl.client.base-url` 是否配置正确
2. token 是否有效（是否从同一后端地址获取的 token）

**Q：更新 SNAPSHOT 版本后本地还是旧的？**

A：执行时加 `-U` 参数强制刷新：

```bash
mvn clean compile -U
```

或删除本地缓存重新拉取：

```bash
mvn dependency:purge-local-resources -DmanualInclude=com.cisdi:sszl-client-sdk
```
